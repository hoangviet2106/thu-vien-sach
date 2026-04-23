import bcrypt from "bcrypt";
import { PrismaClient, UserRole } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
    const passwordHash = await bcrypt.hash("password123", 12);

    const librarian = await prisma.user.upsert({
        where: { email: "librarian@university.edu" },
        update: {},
        create: {
            email: "librarian@university.edu",
            fullName: "Default Librarian",
            role: UserRole.LIBRARIAN,
            passwordHash
        }
    });

    const studentUser = await prisma.user.upsert({
        where: { email: "student@university.edu" },
        update: {},
        create: {
            email: "student@university.edu",
            fullName: "Default Student",
            role: UserRole.STUDENT,
            passwordHash
        }
    });

    await prisma.studentProfile.upsert({
        where: { userId: studentUser.id },
        update: {},
        create: {
            userId: studentUser.id,
            studentCode: "SV000001"
        }
    });

    await prisma.book.upsert({
        where: { isbn: "9780451524935" },
        update: {},
        create: {
            isbn: "9780451524935",
            title: "1984",
            author: "George Orwell",
            totalCopies: 5,
            category: "Literature",
            publishYear: 1949
        }
    });

    console.log("Seed completed", { librarian: librarian.email, student: studentUser.email });
}

main()
    .catch((error) => {
        console.error(error);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
