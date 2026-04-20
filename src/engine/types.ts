export enum ClassOfService {
  Expedite = "expedite",
  FixedDate = "fixed_date",
  Standard = "standard",
  Intangible = "intangible",
}

export enum WorkItemType {
  Feature = "feature",
  Bug = "bug",
  TechDebt = "tech_debt",
}

export enum DistributionType {
  Exponential = "exponential",
  LogNormal = "log_normal",
  Normal = "normal",
  Uniform = "uniform",
  Fixed = "fixed",
  Poisson = "poisson",
}

export interface DistributionConfig {
  type: DistributionType;
  params: Record<string, number>;
}

export interface SubColumn {
  name: string;
  items: string[];
}

export interface StageConfig {
  id: string;
  name: string;
  wipLimit: number | null;
  serviceTime: DistributionConfig;
  workers: number;
  hasSubColumns: boolean;
}

export interface BoardConfig {
  stages: StageConfig[];
  arrivalRate: DistributionConfig;
  pullPolicy: PullPolicyType;
  wipPolicy: WipPolicyType;
  batchSize: number;
  simulationDuration: number;
}

export enum PullPolicyType {
  FIFO = "fifo",
  ShortestFirst = "shortest_first",
  CostOfDelay = "cost_of_delay",
  Priority = "priority",
}

export enum WipPolicyType {
  Strict = "strict",
  Soft = "soft",
}

export interface WorkItem {
  id: string;
  type: WorkItemType;
  classOfService: ClassOfService;
  estimatedSize: number;
  createdAt: number;
  enteredAt: number | null;
  deliveredAt: number | null;
  currentStage: string | null;
  blocked: boolean;
  blockReason: string | null;
  blockedAt: number | null;
  blockedDuration: number;
  stageHistory: StageEntry[];
}

export interface StageEntry {
  stageId: string;
  enteredAt: number;
  exitedAt: number | null;
  waitTime: number;
  activeTime: number;
}

export type SimulationEvent =
  | { type: "item_arrived"; time: number; itemId: string; item: WorkItem }
  | { type: "item_pulled"; time: number; itemId: string; stageId: string }
  | { type: "work_started"; time: number; itemId: string; stageId: string }
  | { type: "work_completed"; time: number; itemId: string; stageId: string }
  | { type: "item_delivered"; time: number; itemId: string; totalLeadTime: number }
  | { type: "item_blocked"; time: number; itemId: string; reason: string }
  | { type: "item_unblocked"; time: number; itemId: string }
  | { type: "stage_wip_changed"; time: number; stageId: string; wip: number }
  | { type: "simulation_started"; time: number; config: BoardConfig; seed: number }
  | { type: "simulation_ended"; time: number };

export interface SimulationConfig {
  board: BoardConfig;
  seed: number;
}

export interface StageState {
  id: string;
  name: string;
  items: string[];
  wipLimit: number | null;
  workers: number;
}

export interface BoardState {
  stages: StageState[];
  backlog: string[];
  done: string[];
  currentTime: number;
}

export interface SimulationResult {
  events: SimulationEvent[];
  snapshots: Snapshot[];
  finalState: BoardState;
}

export interface Snapshot {
  time: number;
  state: BoardState;
  eventIndex: number;
}
