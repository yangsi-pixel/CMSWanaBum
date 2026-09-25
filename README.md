# Nativora Content Studio

A React + Firebase Firestore CMS for managing Nativora language content.

## Run locally

```bash
npm install
npm run dev
```

The Firebase web configuration is in `src/firebase.js`. The provided config is safe to ship in a client app, but access is controlled by Firebase Authentication and Firestore Security Rules.

Before signing in, enable Email/Password in Firebase Console under Authentication > Sign-in method and create a Firestore database. The app supports these collections: `dialects`, `lessons`, `stories`, `vocabulary`, `exercises`, `achievements`, and `users`. Vocabulary entries are stored in one `vocabulary` subcollection under each lesson and use `type` (`word` or `sentence`) to distinguish the entry shape. Lessons are stored directly under each dialect.

## Account approval

The first time an email/password account signs in, the app creates `adminUsers/{firebaseUid}` with `status: false` and signs the user back out. The `users` collection remains reserved for application users and learner progress. To approve a CMS account:

1. Open Firebase Console > Firestore Database > `adminUsers`.
2. Open the document whose ID matches the user's Firebase Authentication UID.
3. Change `status` from `false` to `true` and save.
4. The user signs in again with the same email and password.

Only `adminUsers` records with `status: true` can enter the CMS or access content under the included `firestore.rules`. Deploy those rules before using the app in production.

## Structure

- `src/components`: reusable shell, data table, and add/edit dialog
- `src/pages`: login and collection views
- `src/services/firestore.js`: modular Firestore CRUD, pagination, and nested collection access
- `src/data/collections.js`: collection metadata used to extend the CMS

For `lessons`, nested `content` and `exercises` are represented by the service layer at `lessons/{lessonId}/...`; stories use `stories/{storyId}/content`.
