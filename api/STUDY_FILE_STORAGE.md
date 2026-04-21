# Study file storage

Study fields `fileUrl` and `results` must never persist binary payloads in the database.

- `http` and `https` values are stored as regular remote URLs.
- `data:application/pdf;base64,...` values are uploaded to Cloudinary before `Study.create` or `study.update`.
- The database stores only the Cloudinary `secure_url` returned by the upload API.

Required configuration for base64 PDF uploads:

```env
CLOUDINARY_URL=cloudinary://API_KEY:API_SECRET@CLOUD_NAME
# or:
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...

# optional
CLOUDINARY_STUDY_FOLDER=docly/studies
```

Clients should always read the persisted URL from the API response after creating or updating a study.
