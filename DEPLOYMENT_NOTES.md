# KOLO Tombola - Deployment Notes

## 🚀 Quick Deploy URLs

Replace these URLs after deployment:

### Backend (Render.com)
- URL: `https://kolo-api.onrender.com`
- Update in: `client/.env.production`

### Frontend (Vercel)
- URL: `https://kolo-tombola.vercel.app`
- Update in: `server` environment variables (CORS_ORIGIN, CLIENT_URL)

### Database (Supabase)
- Dashboard: `https://app.supabase.com`

## 📝 Deployment Checklist

- [ ] GitHub repository created and pushed
- [ ] Supabase project created and schema executed
- [ ] Render backend deployed with environment variables
- [ ] Vercel frontend deployed
- [ ] Backend migration executed (`npm run migrate`)
- [ ] CORS configured correctly
- [ ] Admin account created
- [ ] Africa's Talking webhook configured
- [ ] Test purchase flow

## 🔑 Important Credentials to Save

1. **JWT_SECRET**: [Generate with `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"`]
2. **ADMIN_PASSWORD**: [Your strong password]
3. **Supabase DB Password**: [From Supabase dashboard]
4. **Africa's Talking API Key**: [From AT dashboard]

## 📞 Support URLs

- Frontend: https://kolo-tombola.vercel.app
- Backend API: https://kolo-api.onrender.com/api
- Database: Supabase Dashboard
- Monitoring: Render + Vercel Dashboards
