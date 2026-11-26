
import prisma from "./src/config/prisma.js";

try {
  await prisma.$connect();

  console.log("SUCCESS: Prisma connected to PostgreSQL");

  const userCount = await prisma.user.count();

  console.log("Users:", userCount);
} catch (error) {
  console.error("FAILED:", error.message);
} finally {
  await prisma.$disconnect();
}
