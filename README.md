# Moolah EJS / Node site

This package is a multi-page Express + EJS website for Moolah with:

- separate pages for Home, About, Menu, Deli, Gallery and Visit
- larger logo treatment and reduced headline sizing
- simple admin editor for:
  - opening hours
  - homepage specials
  - menu sections
  - deli highlights
  - core site copy
- content persistence to a JSON file stored in `DATA_DIR` when present

## Run locally

```bash
npm install
ADMIN_PASSWORD=yourpassword npm start
```

Then open `http://localhost:3000`

## Recommended Render environment variables

```bash
ADMIN_PASSWORD=change-this
SESSION_SECRET=change-this-too
DATA_DIR=/var/data
```

## Content storage

The editable content is stored in:

```bash
/var/data/moolah-site-content.json
```

when `DATA_DIR=/var/data` is set.

## Notes on content and photos

The initial text content is based on public business descriptions and review/listing information.
The gallery is wired with placeholder image slots so official shop photography can be dropped into:

```bash
/public/images/
```

and referenced in the content file later.

## Replace placeholder photos

Update the `gallery` entries in the content JSON file or extend the admin page later if you want photo-path editing from the browser.
