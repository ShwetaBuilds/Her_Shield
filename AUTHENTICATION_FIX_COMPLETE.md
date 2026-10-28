# Authentication notes

This document replaces an outdated generated summary that claimed the full product was production-ready. The application has since been inspected and its relevant code has been updated; those earlier status claims and embedded environment examples must not be relied on.

Authentication currently uses the Express API in `backend/`, bcrypt password hashing, a locally configured JWT signing secret, and Atlas-backed users. Password reset and external sign-in are not implemented. Signup and login could not be end-to-end verified until Atlas DNS/network access is restored.

Use [QUICK_START.md](./QUICK_START.md) for the current project entry points, environment variable names, startup commands, and remaining limitations. Never store actual credentials in documentation.
