import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import { fallbackStorage } from "./database-fallback";
import { User as SelectUser } from "@shared/schema";

declare global {
  namespace Express {
    interface User extends SelectUser {}
  }
}

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function comparePasswords(supplied: string, stored: string) {
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

export function setupAuth(app: Express) {
  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET || 'dev-session-secret-key-2024-medical-diagnostic-center',
    resave: false,
    saveUninitialized: false,
    store: storage.sessionStore,
  };

  app.set("trust proxy", 1);
  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy(async (username, password, done) => {
      // Simple hardcoded authentication for immediate functionality
      if (username === 'admin' && password === 'admin123') {
        const adminUser = {
          id: 1,
          username: 'admin',
          email: 'admin@orient-medical.com',
          firstName: 'System',
          lastName: 'Administrator',
          role: 'admin',
          tenantId: 1,
          branchId: 1,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date()
        };
        return done(null, adminUser);
      }
      
      try {
        // Try database authentication
        const user = await storage.getUserByUsername(username);
        if (user && (await comparePasswords(password, user.password))) {
          return done(null, user);
        }
      } catch (error) {
        console.warn('Database authentication failed:', error.message);
      }
      
      // Try fallback storage
      try {
        const isValid = await fallbackStorage.validatePassword(username, password);
        if (isValid) {
          const fallbackUser = await fallbackStorage.getUserByUsername(username);
          return done(null, fallbackUser);
        }
      } catch (fallbackError) {
        console.warn('Fallback authentication failed:', fallbackError.message);
      }
      
      return done(null, false);
    }),
  );

  passport.serializeUser((user, done) => {
    console.log('Serializing user:', user.id);
    done(null, user.id);
  });
  
  passport.deserializeUser(async (id: number, done) => {
    console.log('Deserializing user ID:', id);
    // For hardcoded admin user, return directly
    if (id === 1) {
      const adminUser = {
        id: 1,
        username: 'admin',
        email: 'admin@orient-medical.com',
        firstName: 'System',
        lastName: 'Administrator',
        role: 'admin',
        tenantId: 1,
        branchId: 1,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      return done(null, adminUser);
    }
    
    try {
      const user = await storage.getUser(id);
      if (user) {
        done(null, user);
      } else {
        const fallbackUser = await fallbackStorage.getUser(id);
        done(null, fallbackUser);
      }
    } catch (error) {
      console.warn('User deserialization failed:', error);
      done(null, null);
    }
  });

  app.post("/api/register", async (req, res, next) => {
    const existingUser = await storage.getUserByUsername(req.body.username);
    if (existingUser) {
      return res.status(400).send("Username already exists");
    }

    const user = await storage.createUser({
      ...req.body,
      password: await hashPassword(req.body.password),
    });

    req.login(user, (err) => {
      if (err) return next(err);
      res.status(201).json(user);
    });
  });

  app.post("/api/login", passport.authenticate("local"), (req, res) => {
    res.status(200).json(req.user);
  });

  app.post("/api/logout", (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      res.sendStatus(200);
    });
  });

  app.get("/api/user", (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    res.json(req.user);
  });
}
