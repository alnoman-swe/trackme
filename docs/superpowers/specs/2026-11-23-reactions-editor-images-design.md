# Reactions, text formatting, image attachments (short design)

## Why
Make comments feel alive (reactions), let entries carry formatting, and let people attach screenshots to what they write.

## Goals
- Emoji reactions on comments: animated, premium, 3D-looking.
- Formatting toolbar on the entry box: bold, italic, link, list.
- Image upload (button, paste, drag-drop) stored in a Railway S3-compatible bucket.

## Non-goals / anti-goals
- Reactions on entries, custom emoji, emails for reactions.
- WYSIWYG editor, image resizing/captions/cleanup. Comments stay plain text (with reactions).
- No public bucket; no raw HTML rendering.

## Approaches
- Reactions: Prisma table + server action + `useOptimistic`, plain CSS animation (chosen). An animation library or websockets were rejected as overkill; the existing 5s refresh already syncs.
- 3D emoji: Microsoft Fluent Emoji 3D PNGs (MIT) shipped in `public/emoji/` (chosen) vs. flat Unicode glyphs (not premium) vs. Lottie (new dependency).
- Formatting: Markdown stored in the existing `body` column, toolbar wraps the textarea selection, tiny renderer outputs React elements (chosen) vs. WYSIWYG (big dependency + migration).
- Images: server route uploads with `@aws-sdk/client-s3`, a sign-in-gated `/files/<key>` route streams from the private bucket (chosen) vs. presigned URLs (expire, break saved entries).

## Design
- `Reaction(comment_id, person_id, emoji)`, unique on all three; deleted with their comment/person. Tap again to remove.
- Emoji: 👍 ❤️ 😂 🎉 🔥 👀 as 3D PNGs. Pills with count, highlighted when mine, tooltip lists who. "+" opens a popover; emoji spring in staggered, tilt/lift on hover. Tap = bounce, count rolls like a ticker, particle burst on add. Honors `prefers-reduced-motion`.
- Env: `S3_ENDPOINT`, `S3_BUCKET`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `S3_REGION`. Limits: jpg/png/gif/webp, ~5 MB.

## Order
1. Reactions 2. Formatting toolbar + renderer 3. Image upload.
