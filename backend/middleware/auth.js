import jwt from "jsonwebtoken";

// Guards protected routes.
// It looks for an "Authorization: Bearer <token>" header, checks the token is
// real and not expired, and if so lets the request through (attaching the
// user's id + role). Otherwise it stops with a 401.
export function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ message: "Not logged in." });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = payload.sub; // who they are
    req.userRole = payload.role; // student or professional
    next(); // token is good - continue to the route
  } catch (err) {
    return res
      .status(401)
      .json({ message: "Session expired. Please log in again." });
  }
}
