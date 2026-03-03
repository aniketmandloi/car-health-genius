"use client";

import { motion } from "motion/react";
import {
  Activity,
  ArrowRight,
  Car,
  DollarSign,
  Plug,
  ScanLine,
  Search,
  Shield,
  Zap,
} from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { staggerContainer, fadeUp } from "@/lib/animation-variants";

const features = [
  {
    icon: Search,
    title: "AI Diagnostics",
    description:
      "Decode check engine lights instantly. Our AI analyzes DTC codes and gives you plain-english explanations with repair recommendations.",
  },
  {
    icon: Activity,
    title: "Health Monitoring",
    description:
      "Track your vehicle's health score over time. Get proactive alerts before small issues become expensive problems.",
  },
  {
    icon: DollarSign,
    title: "Cost Savings",
    description:
      "Get fair repair cost estimates, DIY guides, and negotiation scripts. Never overpay at the mechanic again.",
  },
];

const steps = [
  {
    icon: Plug,
    title: "Connect",
    description: "Plug in your OBD-II scanner or enter codes manually",
  },
  {
    icon: ScanLine,
    title: "Scan",
    description: "Our AI analyzes diagnostic trouble codes and sensor data",
  },
  {
    icon: Shield,
    title: "Diagnose",
    description: "Get detailed analysis, repair guides, and cost estimates",
  },
];

export default function Home() {
  return (
    <div className="relative overflow-hidden">
      {/* ── Animated gradient orbs ── */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-1/2 -left-1/4 h-[800px] w-[800px] rounded-full bg-cyan-500/10 blur-[120px] animate-pulse" />
        <div className="absolute -bottom-1/2 -right-1/4 h-[600px] w-[600px] rounded-full bg-violet-500/10 blur-[120px] animate-pulse [animation-delay:2s]" />
      </div>

      {/* ── Hero ── */}
      <section className="relative flex min-h-[calc(100svh-3.5rem)] flex-col items-center justify-center px-4 text-center">
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          animate="show"
          className="mx-auto max-w-3xl space-y-6"
        >
          <motion.div variants={fadeUp}>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
              <Zap className="size-3" />
              AI-Powered Diagnostics
            </span>
          </motion.div>

          <motion.h1
            variants={fadeUp}
            className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl"
          >
            Your Car&apos;s Health.{" "}
            <span className="bg-gradient-to-r from-cyan-400 to-emerald-400 bg-clip-text text-transparent">
              Decoded.
            </span>
          </motion.h1>

          <motion.p
            variants={fadeUp}
            className="mx-auto max-w-xl text-base text-muted-foreground sm:text-lg"
          >
            Stop guessing what your check engine light means. Get instant AI
            analysis, repair cost estimates, and step-by-step DIY guides.
          </motion.p>

          <motion.div
            variants={fadeUp}
            className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center"
          >
            <Link href={"/login" as never}>
              <Button size="lg" className="gap-2 shadow-[0_0_24px_rgba(6,182,212,0.25)]">
                Get Started
                <ArrowRight className="size-4" />
              </Button>
            </Link>
            <Link href={"/pricing" as never}>
              <Button
                variant="outline"
                size="lg"
                className="gap-2 dark:bg-white/5 dark:border-white/10 dark:hover:bg-white/10"
              >
                View Plans
              </Button>
            </Link>
          </motion.div>
        </motion.div>
      </section>

      {/* ── Features ── */}
      <section className="relative px-4 py-20 md:py-28">
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-100px" }}
          className="mx-auto max-w-5xl"
        >
          <motion.div variants={fadeUp} className="mb-12 text-center">
            <h2 className="text-2xl font-bold sm:text-3xl">
              Everything you need to stay{" "}
              <span className="text-primary">ahead of repairs</span>
            </h2>
            <p className="mt-3 text-muted-foreground">
              Powered by AI. Built for car owners who want transparency.
            </p>
          </motion.div>

          <div className="grid gap-6 md:grid-cols-3">
            {features.map((feature) => (
              <motion.div
                key={feature.title}
                variants={fadeUp}
                className="group rounded-2xl border border-border/50 bg-card p-6 transition-all duration-200 hover:shadow-[0_0_24px_rgba(6,182,212,0.12)] hover:-translate-y-0.5 dark:bg-white/[0.04] dark:border-white/[0.08]"
              >
                <div className="mb-4 flex size-10 items-center justify-center rounded-xl bg-primary/10">
                  <feature.icon className="size-5 text-primary" />
                </div>
                <h3 className="mb-2 text-base font-semibold">{feature.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {feature.description}
                </p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* ── How It Works ── */}
      <section className="relative px-4 py-20 md:py-28">
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-100px" }}
          className="mx-auto max-w-4xl"
        >
          <motion.div variants={fadeUp} className="mb-12 text-center">
            <h2 className="text-2xl font-bold sm:text-3xl">
              How it works
            </h2>
            <p className="mt-3 text-muted-foreground">
              Three simple steps to understand your vehicle
            </p>
          </motion.div>

          <div className="relative grid gap-8 md:grid-cols-3">
            {/* Connecting gradient line (desktop) */}
            <div className="pointer-events-none absolute top-12 left-[16.67%] right-[16.67%] hidden h-0.5 bg-gradient-to-r from-cyan-500/40 via-cyan-500/20 to-cyan-500/40 md:block" />

            {steps.map((step, i) => (
              <motion.div
                key={step.title}
                variants={fadeUp}
                className="relative flex flex-col items-center text-center"
              >
                <div className="relative z-10 mb-4 flex size-14 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10">
                  <step.icon className="size-6 text-primary" />
                </div>
                <span className="mb-1 text-xs font-medium text-primary">
                  Step {i + 1}
                </span>
                <h3 className="mb-1.5 text-base font-semibold">{step.title}</h3>
                <p className="text-sm text-muted-foreground">
                  {step.description}
                </p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* ── CTA Banner ── */}
      <section className="px-4 pb-20 md:pb-28">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="mx-auto max-w-3xl"
        >
          <div className="relative overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10 p-8 text-center dark:from-primary/10 dark:to-primary/5 md:p-12">
            <Car className="mx-auto mb-4 size-10 text-primary" />
            <h2 className="mb-3 text-xl font-bold sm:text-2xl">
              Ready to take control of your car&apos;s health?
            </h2>
            <p className="mb-6 text-muted-foreground">
              Join thousands of car owners saving money and avoiding surprise repairs.
            </p>
            <Link href={"/login" as never}>
              <Button size="lg" className="gap-2 shadow-[0_0_24px_rgba(6,182,212,0.25)]">
                Start For Free
                <ArrowRight className="size-4" />
              </Button>
            </Link>
          </div>
        </motion.div>
      </section>
    </div>
  );
}
