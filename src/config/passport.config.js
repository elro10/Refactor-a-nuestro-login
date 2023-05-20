import passport from "passport";
import LocalStrategy from "passport-local";
import GithubStrategy from "passport-github2";
import jwt, { ExtractJwt } from "passport-jwt";
import { UserModel } from "../dao/models/user.model.js";
import { createHash } from "../server/utils.js";
import {options} from "../config/options.js";
import { CartManager } from "../dao/index.js";

const jwtStrategy = jwt.Strategy;
const cartToWork = new CartManager();

const initializedPassport = () => {
  //local
  passport.use(
    "signupStrategy",
    new LocalStrategy(
      {
        usernameField: "email",
        passreqToCallback: true,
      },
      async (username, password, done) => {
        try {
          const user = await UserModel.findOne({ email: username });
          if (user) {
            console.log(
              "puede que ya estes registrado, si la falla persiste comunicate con admin"
            );
            return done(null, false);
          }
          const newUser = {
            email: username,
            password: createHash(password),
            cart: await cartToWork.createCart()
          };
          const userCreated = await UserModel.create(newUser);
          return done(null, userCreated);
        } catch (error) {
          return done(error);
        }
      }
    )
  );
  //github

  passport.use(
    "githubSignup",
    new GithubStrategy(
      {
        clientID: "Iv1.9acc1c8936ff4669",
        clientSecret: "08947845076f7d7e4bf6e97578701311487da043",
        callbackURL: "http://localhost:8080/api/sessions/github-callback",
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          console.log("profile", profile);
          const userExist = await UserModel.findOne({
            email: profile.username,
          });
          if (userExist) {
            return done(null, userExist);
          }
          const newUser = {
            email: profile.username,
            password: createHash(profile.id),
          };
          const userCreated = await UserModel.create(newUser);
          return done(null, userCreated);
        } catch (error) {
          return done(error);
        }
      }
    )
  );
  
  //jwt
  passport.use("authJWT", new jwtStrategy(
    {
      jwtFromRequest: ExtractJwt.fromExtractors([cookieExtractor]),
      secretOrKey: "tokenFuerte"
    },
    async(jwt_payload,done) =>{
      try {
        return done(null,jwt_payload)
      } catch (error) {
        return done(error);
      }
    }
    ))

  //serial
  passport.serializeUser((user, done) => {
    done(null, user._id);
  });

  passport.deserializeUser(async (id, done) => {
    const user = await UserModel.findById(id);
    return done(null, user);
  });
};

const cookieExtractor = (req) => {
  let token = null;
  if(req && req.cookies){
    token = req.cookies[options.server.cookieToken]
  }
  return token;
}

export { initializedPassport, cookieExtractor };
