#!/usr/bin/env python3
"""Rebuild the SCHEMA of the shared Supabase project from a catalog dump and print it as SQL.

The dump is produced by read-only SELECTs on pg_catalog / information_schema (tables, columns,
types, constraints, indexes, policies, functions, triggers, views, grants). It contains NO row data
of any table. This script only turns those JSON files into DDL, so the privacy migrations and their
tests can run on a database with the same shape as production. Usage:

    python3 build-live-schema.py <dump dir> | psql -d <empty database that has the supabase stub>
"""
import json, os, sys

D = sys.argv[1]
def load(n):
    with open(os.path.join(D, n + '.json'), encoding='utf-8') as f:
        return json.load(f)

tables = [t for t in load('tables') if t['relkind'] in ('r', 'p')]
columns = load('columns')
ftypes = {(r['relname'], r['attname']): r['ftype'] for r in load('format_types')}
constraints = load('constraints')
indexes = load('indexes')
policies = load('policies')
enums = load('enums')
functions = load('functions')
triggers = load('triggers')
auth_triggers = load('auth_triggers')
views = load('views')
grants = load('table_grants')

out = []
w = out.append
w('SET check_function_bodies = off;')
w('CREATE EXTENSION IF NOT EXISTS "uuid-ossp" SCHEMA extensions;')
for e in enums:
    labels = ', '.join("'" + l.replace("'", "''") + "'" for l in e['labels'].split('\t'))
    w(f'CREATE TYPE public.{e["typname"]} AS ENUM ({labels});')

by_table = {}
for c in columns:
    by_table.setdefault(c['table_name'], []).append(c)
for t in tables:
    name = t['relname']
    cols = []
    for c in sorted(by_table.get(name, []), key=lambda c: c['ordinal_position']):
        line = f'"{c["column_name"]}" {ftypes[(name, c["column_name"])]}'
        if c['is_generated'] == 'ALWAYS':
            line += f' GENERATED ALWAYS AS ({c["generation_expression"]}) STORED'
        elif c['column_default'] is not None:
            line += f' DEFAULT {c["column_default"]}'
        if c['is_nullable'] == 'NO':
            line += ' NOT NULL'
        cols.append(line)
    w(f'CREATE TABLE public."{name}" (\n  ' + ',\n  '.join(cols) + '\n);')

for k in constraints:
    if k['contype'] in ('p', 'u', 'c', 'x'):
        w(f'ALTER TABLE public."{k["tbl"]}" ADD CONSTRAINT "{k["conname"]}" {k["def"]};')
for k in constraints:
    if k['contype'] == 'f':
        w(f'ALTER TABLE public."{k["tbl"]}" ADD CONSTRAINT "{k["conname"]}" {k["def"]};')
for i in indexes:
    d = i['indexdef'].replace('CREATE UNIQUE INDEX', 'CREATE UNIQUE INDEX IF NOT EXISTS', 1).replace('CREATE INDEX', 'CREATE INDEX IF NOT EXISTS', 1)
    w(d + ';')
for f in functions:
    w(f['def'].rstrip().rstrip(';') + ';')
for v in views:
    w(f'CREATE OR REPLACE VIEW public."{v["relname"]}" AS {v["def"].rstrip().rstrip(";")};')
for t in triggers:
    w(t['def'] + ';')
for t in auth_triggers:
    w(t['def'] + ';')
for t in tables:
    w(f'ALTER TABLE public."{t["relname"]}" ENABLE ROW LEVEL SECURITY;' if t['rls'] else f'ALTER TABLE public."{t["relname"]}" DISABLE ROW LEVEL SECURITY;')
    if t['force_rls']:
        w(f'ALTER TABLE public."{t["relname"]}" FORCE ROW LEVEL SECURITY;')
for p in policies:
    roles = p['roles'].strip('{}') or 'public'
    stmt = f'CREATE POLICY "{p["policyname"]}" ON public."{p["tablename"]}" AS {p["permissive"]} FOR {p["cmd"]} TO {roles}'
    if p['qual']:
        stmt += f' USING ({p["qual"]})'
    if p['with_check']:
        stmt += f' WITH CHECK ({p["with_check"]})'
    w(stmt + ';')
w('REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon, authenticated, service_role;')
for g in grants:
    w(f'GRANT {g["privilege_type"]} ON public."{g["table_name"]}" TO {g["grantee"]};')
print('\n'.join(out))
