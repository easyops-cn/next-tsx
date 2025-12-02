import { computeRouteScore } from "./convertRoutes.js";

describe("computeRouteScore", () => {
  describe("basic scoring", () => {
    it("should score static segments higher than dynamic segments", () => {
      // /users/profile has 2 static segments = 2 + 10 + 10 = 22
      // /users/:id has 1 static + 1 dynamic = 2 + 10 + 3 = 15
      expect(computeRouteScore("/users/profile")).toBeGreaterThan(
        computeRouteScore("/users/:id")
      );
    });

    it("should score longer static paths higher", () => {
      // /users/profile/settings = 3 + 10 + 10 + 10 = 33
      // /users/profile = 2 + 10 + 10 = 22
      expect(computeRouteScore("/users/profile/settings")).toBeGreaterThan(
        computeRouteScore("/users/profile")
      );
    });

    it("should penalize splat routes", () => {
      // /users/* = 2 - 2 + 10 = 10 (splat doesn't contribute to reduce)
      // /users/:id = 2 + 10 + 3 = 15
      expect(computeRouteScore("/users/*")).toBeLessThan(
        computeRouteScore("/users/:id")
      );
    });

    it("should handle root path", () => {
      // Root path "/" has no segments, score = 0
      expect(computeRouteScore("/")).toBe(0);
    });
  });

  describe("${APP.homepage} prefix handling", () => {
    it("should strip ${APP.homepage} prefix before scoring", () => {
      expect(computeRouteScore("${APP.homepage}/users/profile")).toBe(
        computeRouteScore("/users/profile")
      );
    });

    it("should handle ${APP.homepage} only (root path)", () => {
      expect(computeRouteScore("${APP.homepage}")).toBe(0);
      expect(computeRouteScore("${APP.homepage}/")).toBe(0);
    });
  });

  describe("route ranking examples", () => {
    it("should rank routes correctly for a typical app", () => {
      const routes = [
        "/",
        "/users",
        "/users/new",
        "/users/:id",
        "/users/:id/edit",
        "/users/:id/profile",
        "/*",
      ];

      const sortedRoutes = [...routes].sort(
        (a, b) => computeRouteScore(b) - computeRouteScore(a)
      );

      // Most specific routes should come first
      expect(sortedRoutes).toEqual([
        "/users/:id/edit", // 3 + 10 + 3 + 10 = 26
        "/users/:id/profile", // 3 + 10 + 3 + 10 = 26
        "/users/new", // 2 + 10 + 10 = 22
        "/users/:id", // 2 + 10 + 3 = 15
        "/users", // 1 + 10 = 11
        "/", // 0
        "/*", // 1 - 2 = -1
      ]);
    });

    it("should prefer static path over dynamic path with same depth", () => {
      const routes = ["/posts/:id", "/posts/new", "/posts/featured"];

      const sortedRoutes = [...routes].sort(
        (a, b) => computeRouteScore(b) - computeRouteScore(a)
      );

      // Static paths should come before dynamic paths
      expect(sortedRoutes[0]).toBe("/posts/new");
      expect(sortedRoutes[1]).toBe("/posts/featured");
      expect(sortedRoutes[2]).toBe("/posts/:id");
    });

    it("should handle nested dynamic segments", () => {
      const routes = [
        "/projects/:projectId/tasks/:taskId",
        "/projects/:projectId/tasks/new",
        "/projects/:projectId/settings",
        "/projects/archived",
      ];

      const sortedRoutes = [...routes].sort(
        (a, b) => computeRouteScore(b) - computeRouteScore(a)
      );

      // More static segments should rank higher
      expect(sortedRoutes[0]).toBe("/projects/:projectId/tasks/new");
      expect(sortedRoutes[1]).toBe("/projects/:projectId/tasks/:taskId");
      expect(sortedRoutes[2]).toBe("/projects/:projectId/settings");
      expect(sortedRoutes[3]).toBe("/projects/archived");
    });
  });

  describe("edge cases", () => {
    it("should handle multiple consecutive slashes", () => {
      // filter(Boolean) should remove empty strings from split
      expect(computeRouteScore("//users//profile")).toBe(
        computeRouteScore("/users/profile")
      );
    });

    it("should handle paths with hyphens in dynamic segments", () => {
      // :user-id should be recognized as a dynamic segment
      expect(computeRouteScore("/users/:user-id")).toBe(
        computeRouteScore("/users/:id")
      );
    });
  });
});
