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
- The main storefront catalog belongs to the designated main store account; anonymous catalog policies follow main_store_owner() so tenant-scoped management and public visibility agree without granting other stores access.
