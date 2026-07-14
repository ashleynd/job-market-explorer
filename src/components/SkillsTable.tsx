import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getSkillStats } from "@/lib/data";

export default async function SkillsTable() {
  const stats = await getSkillStats();

  return (
    <Card className="mb-6 px-4">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Skill</TableHead>
            <TableHead>Postings</TableHead>
            <TableHead>7-day trend</TableHead>
            <TableHead>Median salary</TableHead>
            <TableHead>Remote</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {stats.map((s) => (
            <TableRow key={s.skill}>
              <TableCell className="font-medium">{s.skill}</TableCell>
              <TableCell>{s.postings.toLocaleString("en-US")}</TableCell>
              <TableCell>
                <Badge
                  variant="outline"
                  className={
                    s.trend6mo >= 0
                      ? "border-success/30 text-success"
                      : "border-destructive/30 text-destructive"
                  }
                >
                  {s.trend6mo >= 0 ? "▲" : "▼"} {Math.abs(Math.round(s.trend6mo * 100))}%
                </Badge>
              </TableCell>
              <TableCell>${Math.round(s.medianSalary / 1000)}K</TableCell>
              <TableCell>{Math.round(s.remoteShare * 100)}%</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
}
