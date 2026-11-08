#!/usr/bin/env python3
"""Only localhost dummy PostgREST, never any real system."""
import base64, hashlib, hmac, json, time, urllib.request, urllib.error
URL='http://127.0.0.1:55444'; SECRET=b'local-dummy-secret-at-least-32-bytes-long'
def token(uid):
    e=lambda x:base64.urlsafe_b64encode(json.dumps(x,separators=(',',':')).encode()).rstrip(b'=')
    s=e({'alg':'HS256','typ':'JWT'})+b'.'+e({'sub':uid,'role':'authenticated','exp':int(time.time())+600})
    return (s+b'.'+base64.urlsafe_b64encode(hmac.new(SECRET,s,hashlib.sha256).digest()).rstrip(b'=')).decode()
def call(uid, method, path, obj=None):
    h={'Authorization':'Bearer '+token(uid),'Content-Type':'application/json','Prefer':'return=representation'}
    req=urllib.request.Request(URL+path, method=method,headers=h,data=json.dumps(obj).encode() if obj else None)
    try:
        with urllib.request.urlopen(req,timeout=5) as res: return res.status,json.load(res)
    except urllib.error.HTTPError as exc: return exc.code,exc.read().decode()
a='aaaaaaaa-0000-0000-0000-000000000011'; b='bbbbbbbb-0000-0000-0000-000000000022'; c='cccccccc-0000-0000-0000-000000000033'
ha='aaaaaaaa-0000-0000-0000-000000000001'; hb='bbbbbbbb-0000-0000-0000-000000000002'
for uid,own,other in [(a,ha,hb),(b,hb,ha)]:
    for table in ('tasks','shopping_items','meals'):
        status,rows=call(uid,'GET','/'+table+'?select=household_id'); assert status==200 and rows==[{'household_id':own}],(table,status,rows)
        status,rows=call(uid,'PATCH','/'+table+'?household_id=eq.'+other,{'name' if table=='meals' else 'title':'bad'}); assert status==200 and rows==[],(table,status,rows)
        status,body=call(uid,'POST','/'+table,{'household_id':other,'name' if table=='meals' else 'title':'bad'}); assert status in (401,403),(table,status,body)
    print('PASS A/B GET, cross PATCH and cross POST',uid)
for table in ('tasks','shopping_items','meals'):
    status,rows=call(c,'GET','/'+table+'?select=household_id'); assert status==200 and rows==[],(table,status,rows)
print('PASS non-household identity GET; synthetic JWTs, no staff policy')
