# RAM Portfolio CMS Demo

## Preview

- Public portfolio: `index.html`
- Admin panel: `admin.html`

## Demo admin login

1. Open `admin.html`.
2. Enter `rambhardwaj3@gmail.com`.
3. Click **Send demo magic link**.
4. Click **Open secure demo session**.

This demo uses browser localStorage. Changes are visible on the public site in the same browser/origin. Refresh the public page after editing.

## Admin controls included

- Edit name, title, bio, tagline and availability
- Replace profile image
- Edit email, phone and social links
- Add, edit, remove and reorder projects
- Replace project images without forced cropping
- Open every project image at full resolution in a new tab
- Add, replace, edit and remove reels with direct play controls
- Add, replace, edit and remove PDF brochures
- Browse brochure pages with custom Previous/Next controls
- Open the original brochure PDF in a new tab
- Add, edit, replace, recolor and remove logos
- Edit project descriptions and design approach
- Add, edit and remove services
- Change accent and background colors
- Export all content as JSON
- Import JSON backup
- Reset demo content
- Open public preview from admin

## Production deployment plan

For a shareable public link and persistent cloud admin:

- Frontend hosting: Vercel
- Database: Supabase Postgres
- Image storage: Supabase Storage
- Admin login: Supabase magic-link authentication
- Security: Row Level Security allowing only RAM's verified admin account to write
- Public visitors: read-only access

The demo's data structure is already compatible with this migration. Replace localStorage functions in `app.js` and `admin.js` with Supabase queries and uploads.

## Important demo limitation

localStorage is browser-specific. It is suitable for reviewing the design and CMS controls, but not for the final public deployment. In production, Supabase will make changes persist across devices and become visible to every visitor.
