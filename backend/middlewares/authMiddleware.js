import 'dotenv/config'
import { auth } from 'express-oauth2-jwt-bearer'

export const checkJwt = auth({
   audience: process.env.AUTH0_AUDIENCE,
 issuerBaseURL: 'https://dev-ljrf3l2o7wyrxwag.us.auth0.com/',
  tokenSigningAlg: 'RS256'
})