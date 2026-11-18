import { NextRequest, NextResponse } from "next/server"

export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const code = searchParams.get("code")
  const state = searchParams.get("state") || "gmail"

  const clientId = process.env.GOOGLE_CLIENT_ID || "673403509107-knjjge23ouvla0h7vd9nsp5kp4stu6lf.apps.googleusercontent.com"

  const redirectUri = `${req.nextUrl.origin}/api/auth/google`

  if (!code) {
    const scope = encodeURIComponent([
      "openid",
      "email",
      "profile",
      "https://www.googleapis.com/auth/gmail.modify",
      "https://www.googleapis.com/auth/drive.readonly",
      "https://www.googleapis.com/auth/calendar.events"
    ].join(" "))

    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${scope}&access_type=offline&prompt=consent&state=${state}`

    return NextResponse.redirect(authUrl)
  }

  const clientSecret = process.env.GOOGLE_CLIENT_SECRET
  if (!clientSecret) {
    return NextResponse.json({ error: "Google OAuth is not configured" }, { status: 500 })
  }

  try {
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code"
      })
    })

    const tokenData = await tokenRes.json()

    if (!tokenRes.ok) {
      return NextResponse.json({ error: tokenData }, { status: 400 })
    }

    return new NextResponse(`
      <!DOCTYPE html>
      <html>
        <head><title>Google Connected</title></head>
        <body style="font-family: -apple-system, sans-serif; text-align: center; padding: 40px;">
          <h2>Google Account Connected</h2>
          <p>You can close this tab and return to Arlen.</p>
          <script>
            if (window.opener) {
              window.opener.postMessage({ type: 'GOOGLE_AUTH_SUCCESS', data: ${JSON.stringify(tokenData)} }, '*');
              window.close();
            }
          </script>
        </body>
      </html>
    `, {
      headers: { "Content-Type": "text/html; charset=utf-8" }
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
