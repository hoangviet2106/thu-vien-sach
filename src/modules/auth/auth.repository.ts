import { PrismaClient } from "@prisma/client";

export class AuthRepository {
    constructor(private readonly prisma: PrismaClient) { }

    async findUserByEmail(email: string) {
        return this.prisma.user.findFirst({
            where: { email, deletedAt: null }
        });
    }

    async findStudentProfileByUserId(userId: string) {
        return this.prisma.studentProfile.findFirst({
            where: { userId, deletedAt: null }
        });
    }
}
