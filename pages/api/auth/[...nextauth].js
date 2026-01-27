import NextAuth from "next-auth"
import GoogleProvider from "next-auth/providers/google";
import StravaProvider from "next-auth/providers/strava";

export const authOptions = {
    providers: [
        GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET
        }),
        StravaProvider({
            clientId: process.env.STRAVA_CLIENT_ID,
            clientSecret: process.env.STRAVA_CLIENT_SECRET,
            authorization: {
                params: {
                    scope: "read,activity:read_all",
                },
            },
        }),
    ],
    callbacks: {
        async jwt({ token, account }) {
            if (account?.provider === "strava") {
                token.stravaAccount = {
                    access_token: account.access_token,
                    refresh_token: account.refresh_token,
                    expires_at: account.expires_at,
                    athlete_id: account.athlete?.id,
                };
            }
            return token;
        },
        async session({ session, token }) {
            if (token.stravaAccount) {
                session.stravaAccount = token.stravaAccount;
            }
            return session;
        },
    },
}

export default NextAuth(authOptions)
