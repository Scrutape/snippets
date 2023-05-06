/**
 * DO NOT USE THIS FILE DIRECTLY OUTSIDE THE PROVIDERS FOLDER
 */
import * as NativeStore from "#/providers/NativeStore";
import * as WebStore from "#/providers/WebStore";
import api from "./APIService";

const store = TAMAGUI_TARGET === "native" ? NativeStore : WebStore;

const REGISTER_ROUTE = "/auth/register";
const LOGIN_ROUTE = "/auth/login";
const VERIFY_ROUTE = "/auth/verify";

type RegisterData = {
  name: string,
  email: string,
  password: string,
  confirm_password: string
}

type LoginData = {
  email: string,
  password: string
}


async function getToken(): Promise<string | null> {
  return await store.get("token");
}

async function getIsGuest() {
  return await store.get("guest");
}

async function setNeedsOnboarding() {
  return await store.save("NEEDS_ONBOARDING", "true");
}

async function getIsOnboarded(): Promise<boolean> {
  const val = store.get("NEEDS_ONBOARDING");
  return val === null;
}

async function clearFirstTimeUserFlag() {
  return await store.remove("NEEDS_ONBOARDING");
}

async function setUserVerificationEmail(email: string) {
  return await store.save("VERIFICATION_EMAIL", email);
}

async function getUserVerificationEmail() {
  return await store.get("VERIFICATION_EMAIL");
}

async function clearUserVerificationEmail() {
  return await store.remove("VERIFICATION_EMAIL");
}


async function _persistToken(_token: string): Promise<boolean> {
  try {
    console.log("TOKEN", _token);
    const s = await store.save("token", _token);
    return true;
  } catch (e) {
    return false;
  }
}

async function register(data: RegisterData): Promise<boolean> {
  try {
    const res = await api.post(REGISTER_ROUTE, { body: data });
    if (res.ok) {
      const user = await res.json();
      console.log("registration user", user);
      const email = await setUserVerificationEmail(user.email);
      // user.Settings is a plain empty object if user needs onboarding
      if (Object.keys(user.Settings).length === 0) {
        await setNeedsOnboarding();
      }
      return true;
    }

    return false;
  } catch (e) {
    console.log(e);
    return false;
  }

}

async function login(data: LoginData): Promise<boolean> {
  try {
    const res = await api.post(LOGIN_ROUTE, { body: data });
    if (res.ok) {
      const {token, user} = await res.json();
      console.log("login user data", token, user);
      await _persistToken(token);
      if (!user.verified) {
        await setUserVerificationEmail(user.email);
      }
      // user.Settings is a plain empty object if user needs onboarding
      if (Object.keys(user.Settings).length === 0) {
        await setNeedsOnboarding();
      }
      return true;
    }
    return false;
  } catch (e) {
    console.log(e);
    return false;
  }
}

async function verify(code: string): Promise<boolean> {
  const email = await getUserVerificationEmail();
  try {
    const res = await api.post(VERIFY_ROUTE, { body: { email, code } });
    if (res.ok) {
      // no body in response
      await clearUserVerificationEmail();
      return true;
    }
    console.log("VERIFICATION FAILED");
    console.error(res);
    const resBody = await res.json();
    console.log(resBody);
    return false;
  } catch (e) {
    console.log(e);
    return false;
  }
}

/**
 * login the user as a guest
 */
async function loginAsGuest(hack = false): Promise<boolean> {
  if (hack) {
    await store.save("notreally", "true");
  }
  await store.save("guest", "true");
  return true;
}

/**
 * Log out the logged in user
 */
async function unset(): Promise<void> {
  await store.remove("guest");
  await store.remove("token");
  await clearFirstTimeUserFlag();
  await clearUserVerificationEmail();
}

/**
 * !!! DO NOT USE THIS SERVICE DIRECTLY OUTSIDE THE PROVIDERS FOLDER
 */
export default {
  getToken,
  getIsGuest,
  getIsOnboarded,
  clearFirstTimeUserFlag,
  getUserVerificationEmail,
  register,
  login,
  verify,
  loginAsGuest,
  unset
};