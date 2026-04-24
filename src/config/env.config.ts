export default () => ({
  database_url: process.env.DATABASE_URL as string,
  port: process.env.APP_PORT ? parseInt(process.env.APP_PORT) : 8000,
  jwt: {
    access_token_secret: process.env.ACCESS_TOKEN_SECRET as string,
    access_expiration_time: process.env.ACCESS_EXPIRATION_TIME as string,
    refresh_token_secret: process.env.REFRESH_TOKEN_SECRET as string,
    refresh_expiration_time: process.env.REFRESH_EXPIRATION_TIME as string,
    referral_token_secret: process.env.REFERRAL_TOKEN_SECRET as string,
    referral_expiration_time: process.env.REFERRAL_EXPIRATION_TIME as string,
    email_verification_token_secret: process.env.EMAIL_VERIFICATION_TOKEN_SECRET as string,
    email_verification_token_expiration_time: process.env.EMAIL_VERIFICATION_TOKEN_EXPIRATION_TIME as string,
  },
    mail: {
    host: process.env.SMTP_HOST as string,
    port: parseInt(process.env.SMTP_PORT as string, 10),
    user: process.env.SMTP_USER as string,
    password: process.env.SMTP_PASS as string,}
});