import swaggerJsdoc from "swagger-jsdoc";

export default swaggerJsdoc({
  definition: {
    openapi: "3.0.0",
    info: {
      title: "BlinkGuard API",
      version: "1.0.0",
      description: "Spam & phishing detection API"
    },
    components: {
      securitySchemes: {
        DashboardApiKey: {
          type: "apiKey",
          in: "header",
          name: "x-dashboard-api-key"
        }
      }
    }
  },
  apis: ["./src/routes/*.js"]
});
