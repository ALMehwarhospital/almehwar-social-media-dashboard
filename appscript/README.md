# Apps Script code

Use [`current/`](./current/) as the source snapshot supplied by the project owner on 2026-10-23. The `.gs` files in this parent directory are older copies and should not be used as the current project.

The `.github/workflows/sync-appscript.yml` workflow is prepared to push source changes on `main` to Script ID `1SH1BM2Em8orwJZ4cmkaDbChd8rN3kfiN75-hDdfvLvtSg6LihYgMi86G`. It requires Apps Script API access and the `ALMEHWAR_CLASPRC_JSON` GitHub Actions secret. Despite its legacy name, this secret stores one-line base64 of the authorized `~/.clasprc.json` file (`base64 -w0 "$HOME/.clasprc.json"` in Cloud Shell); the workflow decodes it back to JSON. Base64 is transport encoding, not encryption. Never commit or send the credential or encoded value in chat.

The workflow checks the live source against the previous GitHub revision and refuses to overwrite edits made directly in Apps Script. It pushes source only; it does not update the existing web-app deployment or run any sync trigger.
