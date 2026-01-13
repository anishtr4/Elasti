import { PrismaClient, Project as PrismaProject } from '@prisma/client';

export type Project = PrismaProject;

const prisma = new PrismaClient();

class ProjectStoreService {
    async getAll(): Promise<Project[]> {
        return await prisma.project.findMany();
    }

    async get(id: string): Promise<Project | null> {
        return await prisma.project.findUnique({
            where: { id },
        });
    }

    async getDueForCrawl(): Promise<Project[]> {
        return await prisma.project.findMany({
            where: {
                nextCrawlAt: { lte: new Date() },
                crawlSchedule: { not: null }
            }
        });
    }

    async create(project: Partial<Project> & { name: string; url: string }): Promise<Project> {
        return await prisma.project.create({
            data: {
                id: project.id,
                name: project.name,
                url: project.url,
                crossReferenceIds: project.crossReferenceIds || [],
                createdAt: project.createdAt,
                crawlSchedule: project.crawlSchedule,
                nextCrawlAt: project.nextCrawlAt,
                lastCrawledAt: project.lastCrawledAt
            }
        });
    }

    async update(id: string, updates: Partial<Project>): Promise<Project | null> {
        try {
            return await prisma.project.update({
                where: { id },
                data: updates,
            });
        } catch (error) {
            return null;
        }
    }

    async delete(id: string): Promise<Project | null> {
        try {
            return await prisma.project.delete({
                where: { id },
            });
        } catch (error) {
            return null;
        }
    }
}

export const ProjectStore = new ProjectStoreService();
