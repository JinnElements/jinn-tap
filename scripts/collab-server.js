import { Hocuspocus } from "@hocuspocus/server";
import { Logger } from "@hocuspocus/extension-logger";
import jsonwebtoken from 'jsonwebtoken';

// JWT secret key - in production, this should be stored in environment variables
const JWT_SECRET = process.env.JWT_SECRET ||'your-secret-key';
const ALLOWED_GROUP = process.env.ALLOWED_GROUP || 'tei';

const server = new Hocuspocus({
  name: "hocuspocus-jinntap",
  port: 8082,
  timeout: 30000,
  debounce: 5000,
  maxDebounce: 30000,
  quiet: false,
  extensions: [new Logger()],
  onAuthenticate: async ({ token }) => {
    try {
      if (!token) {
        throw new Error('No token provided');
      }
      
      // Verify the JWT token
      const decoded = jsonwebtoken.decode(token, JWT_SECRET);
      if (!decoded.groups.includes(ALLOWED_GROUP)) {
        throw new Error('User does not have access to this service');
      }

      // You can add additional checks here, like checking if the user has access to the document
      return {
        user: decoded.user
        // Add any additional user data you want to make available in the collaboration session
      };
    } catch (error) {
      console.error('Authentication failed:', error.message);
      throw new Error('Authentication failed');
    }
  }
});

server.listen();