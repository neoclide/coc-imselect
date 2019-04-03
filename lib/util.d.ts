export interface Color {
    red: string;
    green: string;
    blue: string;
}
export declare function setColor(red: string, green: string, blue: string): Promise<void>;
export declare function getColor(): Promise<Color>;
export declare function selectInput(method: string): Promise<void>;
