# Setting Up Text-to-Speech Credentials

You have a **Google API key** for Gemini AI, but Text-to-Speech requires a **Service Account** with OAuth2 credentials. Here's how to set it up:

## Quick Steps (5 minutes)

### 1. Enable Text-to-Speech API

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project (or create a new one)
3. Go to **APIs & Services** > **Library**
4. Search for **"Cloud Text-to-Speech API"**
5. Click **Enable**

### 2. Create a Service Account

1. Go to **APIs & Services** > **Credentials**
2. Click **+ CREATE CREDENTIALS** > **Service Account**
3. Fill in:
   - **Service account name**: `debate-tts-service` (or any name)
   - Click **CREATE AND CONTINUE**
4. Add role:
   - Select **Cloud Text-to-Speech User** role
   - Click **CONTINUE** > **DONE**

### 3. Create and Download Key

1. Click on the service account you just created
2. Go to **KEYS** tab
3. Click **ADD KEY** > **Create new key**
4. Choose **JSON** format
5. Click **CREATE**
6. A JSON file will download automatically

### 4. Add Credentials to Your Project
1. Check 'docker-compose.yml' for the path to paste the credential json file.

2. Update `docker-compose.yml` to mount the credentials:

3. Restart Docker:
   ```bash
   docker compose down
   docker compose up -d
   ```
**Note: One Json Credential should work for both tts and stt**

**Option B: Using gcloud CLI (Alternative)**

If you have gcloud CLI installed:
```bash
gcloud auth application-default login
```

This sets up Application Default Credentials automatically.

### 5. Verify It Works

1. Check backend logs:
   ```bash
   docker compose logs backend | grep TTS
   ```

   You should see:
   ```
   INFO: Google Cloud TTS client initialized with service account
   ```

2. Test in the app:
   - Open http://localhost:3000
   - Start a debate
   - Send a message
   - You should hear the AI voice!

## Security Notes

⚠️ **Important**: Don't commit the JSON credentials file to git!

Add to `.gitignore`:
```bash
echo 'backend/gcp-credentials.json' >> .gitignore
```

## Troubleshooting

### "API not enabled" error
- Make sure you enabled the **Cloud Text-to-Speech API** in step 1
- Wait 2-3 minutes for it to fully activate

### "Permission denied" error
- Verify the service account has the **Cloud Text-to-Speech User** role
- Try recreating the service account key

### File not found error
- Check the file path is correct in docker-compose.yml
- Ensure the volume mount uses the correct path

### Still not working?
- Check backend logs: `docker compose logs backend --tail 50`
- Verify the JSON file is valid (should start with `{` and contain `"type": "service_account"`)

## Cost Information

- **Free tier**: 0-1 million characters per month (Standard voices)
- **After free tier**: $4.00 per 1 million characters
- Most debate sessions use 500-2000 characters per response
- The app caches audio to minimize repeated API calls

## Testing Without Credentials

Your app works perfectly without TTS credentials - responses will just be text-only. You can add voice anytime later!

---

Need help? Check the [AI_VOICE_SETUP.md](./AI_VOICE_SETUP.md) for more details.
