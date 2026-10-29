<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Calculate combo availability through the shared inventory helper for both public and authenticated product reads; stored combo stock is not authoritative because availability depends on all recipe components.
- Operational rows use owner_id: NULL is the existing Frango Show store, customer UUIDs are isolated stores; restrictive RLS and RPC validation enforce ownership so new accounts start empty without deleting legacy records.
- Protected server functions attach the dashboard's custom session bearer through src/start.ts; privileged deletion verifies is_superadmin and rejects self/master deletion, preserving historical store records.
- Plans registration uses the same trial signup as the admin; checkout uses the shared billing eligibility helper and revalidates the current account before leaving the app so signup never initiates payment.
