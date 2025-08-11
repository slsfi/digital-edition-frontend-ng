export interface HeadingNode {
  id: string | null;
  text: string;
  level: number;
  children: HeadingNode[];
}
