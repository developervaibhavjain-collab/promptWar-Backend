import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Define users JSON file location
const USERS_FILE_PATH = path.join(__dirname, '..', 'data', 'users.json');

// Ensure directory exists
const ensureDirectoryExists = () => {
  const dir = path.dirname(USERS_FILE_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
};

// Read users from file
export const readUsers = () => {
  ensureDirectoryExists();
  if (!fs.existsSync(USERS_FILE_PATH)) {
    fs.writeFileSync(USERS_FILE_PATH, JSON.stringify([]));
    return [];
  }
  try {
    const data = fs.readFileSync(USERS_FILE_PATH, 'utf8');
    return JSON.parse(data || '[]');
  } catch (error) {
    console.error('Error reading users file:', error);
    return [];
  }
};

// Write users to file
export const writeUsers = (users) => {
  ensureDirectoryExists();
  try {
    fs.writeFileSync(USERS_FILE_PATH, JSON.stringify(users, null, 2), 'utf8');
    return true;
  } catch (error) {
    console.error('Error writing users file:', error);
    return false;
  }
};

// Find user by email
export const findUserByEmail = (email) => {
  const users = readUsers();
  return users.find((user) => user.email.toLowerCase() === email.toLowerCase());
};

// Create a new user
export const createUser = (userObj) => {
  const users = readUsers();
  users.push(userObj);
  writeUsers(users);
  return userObj;
};

// Save user's refresh token
export const saveUserRefreshToken = (email, refreshToken) => {
  const users = readUsers();
  const userIndex = users.findIndex((user) => user.email.toLowerCase() === email.toLowerCase());
  if (userIndex !== -1) {
    // We can store multiple refresh tokens or just a single one. Let's store a list or single token.
    users[userIndex].refreshToken = refreshToken;
    writeUsers(users);
    return true;
  }
  return false;
};

// Remove user's refresh token
export const clearUserRefreshToken = (email) => {
  const users = readUsers();
  const userIndex = users.findIndex((user) => user.email.toLowerCase() === email.toLowerCase());
  if (userIndex !== -1) {
    delete users[userIndex].refreshToken;
    writeUsers(users);
    return true;
  }
  return false;
};
