import { ProjectStore } from '../storage/project-store';
import { addCrawlJob } from '../../workers/crawl-worker';

export class SchedulerService {
    private interval: NodeJS.Timeout | null = null;

    start() {
        if (this.interval) return;
        // Check every minute
        this.interval = setInterval(() => this.processDueCrawls(), 60 * 1000);
        console.log('🕒 Scheduler started');
    }

    stop() {
        if (this.interval) clearInterval(this.interval);
        this.interval = null;
    }

    async processDueCrawls() {
        try {
            const dueProjects = await ProjectStore.getDueForCrawl();

            for (const project of dueProjects) {
                console.log(`🕒 Triggering scheduled crawl for ${project.name} (${project.id})`);

                // Trigger Crawl
                try {
                    await addCrawlJob({
                        projectId: project.id,
                        url: project.url,
                        maxPages: 50 // Default for scheduled crawls
                    });

                    // Calculate next date based on CURRENT TIME, not previous scheduled time
                    // This prevents catch-up loops if the server was down
                    const nextDate = this.calculateNextCrawl(project.crawlSchedule || 'daily');

                    // Update Project
                    await ProjectStore.update(project.id, {
                        nextCrawlAt: nextDate
                        // lastCrawledAt is updated by the crawler worker upon success/failure usually, 
                        // but updating here as "triggered at" is also fine for now or if worker doesn't update it yet.
                        // Actually, let's leave lastCrawledAt for the completion, or set it here as "Attempted".
                    });
                } catch (e) {
                    console.error(`Failed to trigger crawl for ${project.id}`, e);
                }
            }
        } catch (error) {
            console.error('Scheduler error:', error);
        }
    }

    private calculateNextCrawl(schedule: string): Date {
        const date = new Date();
        switch (schedule.toLowerCase()) {
            case 'daily':
                date.setDate(date.getDate() + 1);
                break;
            case 'weekly':
                date.setDate(date.getDate() + 7);
                break;
            case 'monthly':
                date.setMonth(date.getMonth() + 1);
                break;
            default:
                date.setDate(date.getDate() + 1);
        }
        return date;
    }
}

export const Scheduler = new SchedulerService();
