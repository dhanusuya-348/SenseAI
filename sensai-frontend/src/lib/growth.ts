export interface GrowthSkill {
    name: string;
    id: int;
}

export interface GrowthData {
    credits: number;
    difficulty_counts: {
        easy: number;
        medium: number;
        hard: number;
    };
    skills: GrowthSkill[];
    growth_days: number;
}

export async function fetchGrowthData(userId: string): Promise<GrowthData | null> {
    try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/growth/${userId}`);
        if (!response.ok) {
            throw new Error("Failed to fetch growth data");
        }
        return await response.json();
    } catch (error) {
        console.error("Error fetching growth data:", error);
        return null;
    }
}
