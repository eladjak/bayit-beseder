# New UI switch

The switch is infrastructure only until C-06 adds the script to the root layout and screens use the hook. It does not enable the redesign by itself.

In Vercel, set `NEXT_PUBLIC_NEW_UI=true` for the desired preview environment and redeploy. Public variables are fixed at build time. To turn it off, remove the variable or change it to `false` and redeploy; rollback takes the time needed for a new deployment, not an instant switch. Production can be enabled the same way only after the owner decides to do so.

On a preview, after the layout integration is in place, add `?ui=v2` to the address to try the new UI on that browser. It is remembered in local storage. Use `?ui=v1` to clear that preference. If the build flag itself is on, clearing the preference does not turn it off. These overrides are disabled in production.

Keep Vercel's **Automatically expose System Environment Variables** enabled so `NEXT_PUBLIC_VERCEL_ENV` is available. If it is missing in a production build, overrides are disabled safely, but testers cannot use the query switch. A local development build also allows overrides.
