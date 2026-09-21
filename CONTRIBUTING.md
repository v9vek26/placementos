# Contributing

Keep changes small and describe the user-visible behavior, verification, and limitations. Use conventional commits such as `docs: clarify setup`, `fix: correct validation`, or `feat: add workflow`.

1. Read the README and docs before changing behavior.
2. Create a focused branch and preserve unrelated code and user data.
3. Run the applicable checks documented in the project. Report failures or unavailable checks honestly.
4. Update feature status and setup instructions in the same change as the implementation.
5. Inspect the staged diff for credentials, personal data, generated output, and unsupported claims.

Use only synthetic examples. Never commit real environment files, access tokens, database dumps, or personal records. Do not force-push shared history. Report sensitive issues using the process in [SECURITY.md](SECURITY.md).
