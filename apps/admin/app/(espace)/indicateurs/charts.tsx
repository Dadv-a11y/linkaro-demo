"use client"

import { Button } from "@linkaro/ui/components/button"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@linkaro/ui/components/card"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@linkaro/ui/components/chart"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@linkaro/ui/components/table"
import { BarChart3, Table2 } from "lucide-react"
import { useState, type ReactNode } from "react"
import { Bar, BarChart, CartesianGrid, LabelList, XAxis, YAxis } from "recharts"

/** Carte de graphique avec bascule vers un tableau (accessibilité, valeurs exactes). */
function ChartCard({
  title,
  description,
  columns,
  rows,
  className,
  children,
}: {
  title: string
  description: string
  columns: [string, string]
  rows: [string, number][]
  className?: string
  children: ReactNode
}) {
  const [asTable, setAsTable] = useState(false)
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
        <CardAction>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setAsTable(!asTable)}
            aria-pressed={asTable}
          >
            {asTable ? <BarChart3 /> : <Table2 />}
            {asTable ? "Graphique" : "Tableau"}
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent>
        {asTable ? (
          <div className="max-h-64 overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{columns[0]}</TableHead>
                  <TableHead className="text-right">{columns[1]}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map(([label, value]) => (
                  <TableRow key={label}>
                    <TableCell>{label}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {value}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          children
        )}
      </CardContent>
    </Card>
  )
}

const signupConfig = {
  inscriptions: { label: "Inscriptions", color: "var(--chart-1)" },
} satisfies ChartConfig

export function SignupsCard({
  data,
  title,
  firstColumn,
  description,
}: {
  data: { day: string; inscriptions: number }[]
  title: string
  firstColumn: string
  description: string
}) {
  return (
    <ChartCard
      title={title}
      description={description}
      columns={[firstColumn, "Inscriptions"]}
      rows={data.map((d) => [d.day, d.inscriptions])}
      className="lg:col-span-3"
    >
      <ChartContainer config={signupConfig} className="aspect-auto h-64 w-full">
        <BarChart
          data={data}
          margin={{ left: -16, right: 16, top: 8 }}
          barCategoryGap={2}
          accessibilityLayer
        >
          <CartesianGrid vertical={false} />
          <XAxis
            dataKey="day"
            tickLine={false}
            axisLine={false}
            interval={Math.max(0, Math.ceil(data.length / 5) - 1)}
            tickMargin={8}
            // Axe compact ; l'infobulle et le tableau gardent le libellé complet.
            tickFormatter={(value: string) => value.replace("Sem. du ", "")}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            allowDecimals={false}
            width={40}
          />
          <ChartTooltip
            cursor={{ fillOpacity: 0.5 }}
            content={<ChartTooltipContent />}
          />
          <Bar
            dataKey="inscriptions"
            fill="var(--color-inscriptions)"
            radius={[4, 4, 0, 0]}
            maxBarSize={24}
          />
        </BarChart>
      </ChartContainer>
    </ChartCard>
  )
}

const networkConfig = {
  comptes: { label: "Comptes connectés", color: "var(--chart-1)" },
} satisfies ChartConfig

export function NetworksCard({
  data,
}: {
  data: { network: string; comptes: number }[]
}) {
  return (
    <ChartCard
      title="Réseaux connectés"
      description="Comptes actuellement connectés, par plateforme"
      columns={["Réseau", "Comptes"]}
      rows={data.map((d) => [d.network, d.comptes])}
      className="lg:col-span-2"
    >
      {data.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Aucun réseau connecté pour l&apos;instant.
        </p>
      ) : (
        <ChartContainer
          config={networkConfig}
          className="aspect-auto w-full"
          style={{ height: Math.max(120, data.length * 56) }}
        >
          <BarChart
            data={data}
            layout="vertical"
            margin={{ left: 8, right: 40 }}
            barCategoryGap={10}
            accessibilityLayer
          >
            <XAxis type="number" hide allowDecimals={false} />
            <YAxis
              type="category"
              dataKey="network"
              tickLine={false}
              axisLine={false}
              width={110}
            />
            <ChartTooltip
              cursor={{ fillOpacity: 0.5 }}
              content={<ChartTooltipContent hideLabel />}
            />
            <Bar
              dataKey="comptes"
              fill="var(--color-comptes)"
              radius={[0, 4, 4, 0]}
              maxBarSize={24}
            >
              <LabelList
                dataKey="comptes"
                position="right"
                className="fill-foreground"
                fontSize={12}
              />
            </Bar>
          </BarChart>
        </ChartContainer>
      )}
    </ChartCard>
  )
}
