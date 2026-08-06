"use client"

import { motion } from "framer-motion"
import { Card, CardContent } from "@/components/ui/card"
import { IndianRupee, TrendingUp, TrendingDown, Wallet, Briefcase } from "lucide-react"
import type { ProjectSummary } from "@/lib/types"

interface SummaryCardsProps {
  projects: ProjectSummary[]
  isLoading?: boolean
}

export function SummaryCards({ projects }: SummaryCardsProps) {
  const totals = projects.reduce(
    (acc, project) => ({
      salesMValue: acc.salesMValue + (project.sales_m_value || 0),
      mOutwardValue: acc.mOutwardValue + (project.m_outward_value || 0),
      orderValue: acc.orderValue + (project.order_value || 0),
      paymentReceived: acc.paymentReceived + (project.payment_received || 0),
      balance: acc.balance + (project.balance || 0),
    }),
    { salesMValue: 0, mOutwardValue: 0, orderValue: 0, paymentReceived: 0, balance: 0 }
  )

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value)
  }

  const cards = [
    {
      title: "Active Projects",
      value: projects.length.toString(),
      icon: Briefcase,
      color: "primary",
      description: "Total projects managed"
    },
    {
      title: "Total Order Value",
      value: formatCurrency(totals.orderValue),
      icon: IndianRupee,
      color: "info",
      description: "Combined contract values"
    },
    {
      title: "Payment Received",
      value: formatCurrency(totals.paymentReceived),
      icon: Wallet,
      color: "success",
      description: "Total funds collected"
    },
    {
      title: "Outstanding Balance",
      value: formatCurrency(totals.balance),
      icon: TrendingDown,
      color: totals.balance > 0 ? "success" : "destructive",
      description: "Remaining to be collected"
    },
  ]

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  }

  const item = {
    hidden: { y: 20, opacity: 0 },
    show: { y: 0, opacity: 1 }
  }

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
    >
      {cards.map((card) => (
        <motion.div key={card.title} variants={item}>
          <Card className="border-0 shadow-md hover:shadow-lg transition-shadow bg-card/60 backdrop-blur-md overflow-hidden group">
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">
                    {card.title}
                  </p>
                  <p className="text-2xl font-bold text-foreground tracking-tight">
                    {card.value}
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-2 font-medium">
                    {card.description}
                  </p>
                </div>
                <div className={`p-2.5 rounded-xl bg-${card.color}/10 group-hover:bg-${card.color}/20 transition-colors`}>
                  <card.icon className={`h-5 w-5 text-${card.color}`} />
                </div>
              </div>
              <div className={`h-1 w-full bg-${card.color}/10 mt-4 rounded-full overflow-hidden`}>
                <motion.div
                  initial={{ x: "-100%" }}
                  animate={{ x: "0%" }}
                  transition={{ duration: 1, delay: 0.5 }}
                  className={`h-full w-1/3 bg-${card.color}/40 rounded-full`}
                />
              </div>
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </motion.div>
  )
}
