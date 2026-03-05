"use client";

import { motion } from "motion/react";
import {
  Activity,
  ArrowRight,
  Car,
  DollarSign,
  Github,
  Instagram,
  Plug,
  ScanLine,
  Search,
  Shield,
  ShieldCheck,
  Star,
  Timer,
  Twitter,
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

const stats = [
  { icon: ShieldCheck, value: "24/7", label: "Safety-first guidance" },
  { icon: Timer, value: "<2 min", label: "Average code explanation time" },
  { icon: Star, value: "4.8/5", label: "Driver satisfaction score" },
];

const footerColumns = [
  {
    heading: "Product",
    links: [
      { href: "/pricing", label: "Pricing" },
      { href: "/dashboard", label: "Dashboard" },
      { href: "/vehicles", label: "Vehicles" },
      { href: "/scan", label: "Scan" },
    ],
  },
  {
    heading: "Company",
    links: [
      { href: "/support", label: "Support" },
      { href: "/account", label: "Account" },
      { href: "/login", label: "Sign In" },
      { href: "/", label: "Home" },
    ],
  },
];

const socialLinks = [
  { href: "https://x.com", label: "X", icon: Twitter },
  { href: "https://www.instagram.com", label: "Instagram", icon: Instagram },
  { href: "https://github.com", label: "GitHub", icon: Github },
];

export default function Home() {
  const year = new Date().getFullYear();

  return (
    <div className="pb-12">
      <section className="cb-page pt-12 text-center md:pt-18">
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          animate="show"
          className="mx-auto max-w-4xl space-y-7"
        >
          <motion.div variants={fadeUp}>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
              <Zap className="size-3" />
              AI Diagnostics for Drivers
            </span>
          </motion.div>

          <motion.h1
            variants={fadeUp}
            className="text-4xl font-semibold tracking-tight sm:text-5xl md:text-6xl"
          >
            Understand your car with confidence.
            <span className="mt-2 block text-primary">No mechanic guesswork.</span>
          </motion.h1>

          <motion.p
            variants={fadeUp}
            className="mx-auto max-w-2xl text-base text-muted-foreground sm:text-lg"
          >
            Decode engine lights, get repair context, and plan maintenance from
            one clean dashboard designed to make complex diagnostics simple.
          </motion.p>

          <motion.div
            variants={fadeUp}
            className="flex flex-col items-center justify-center gap-3 sm:flex-row"
          >
            <Link href={"/login" as never}>
              <Button size="lg" className="gap-2">
                Get Started
                <ArrowRight className="size-4" />
              </Button>
            </Link>
            <Link href={"/pricing" as never}>
              <Button variant="outline" size="lg">
                View Pricing
              </Button>
            </Link>
          </motion.div>
        </motion.div>
      </section>

      <section className="cb-page pb-4 md:pb-8">
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-100px" }}
          className="grid gap-4 md:grid-cols-3"
        >
          {features.map((feature) => (
            <motion.div
              key={feature.title}
              variants={fadeUp}
              className="cb-section surface-card-hover p-6 text-left"
            >
              <div className="mb-3 flex size-10 items-center justify-center rounded-xl bg-primary/10">
                <feature.icon className="size-5 text-primary" />
              </div>
              <h3 className="text-lg font-semibold">{feature.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {feature.description}
              </p>
            </motion.div>
          ))}
        </motion.div>
      </section>

      <section className="cb-page pb-2">
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-80px" }}
          className="cb-section grid gap-3 p-4 sm:grid-cols-3 sm:p-5"
        >
          {stats.map((stat) => (
            <motion.div
              key={stat.label}
              variants={fadeUp}
              className="surface-card-hover rounded-lg border border-border/70 bg-card px-4 py-3"
            >
              <div className="mb-2 flex items-center gap-2 text-primary">
                <stat.icon className="size-4" />
                <span className="text-sm font-semibold">{stat.value}</span>
              </div>
              <p className="text-xs text-muted-foreground">{stat.label}</p>
            </motion.div>
          ))}
        </motion.div>
      </section>

      <section className="cb-page">
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-100px" }}
          className="cb-section p-6 md:p-8"
        >
          <motion.div variants={fadeUp} className="mb-8 text-center">
            <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              How it works
            </h2>
            <p className="mt-2 text-sm text-muted-foreground sm:text-base">
              Three steps from warning light to an actionable plan.
            </p>
          </motion.div>

          <div className="grid gap-6 md:grid-cols-3">
            {steps.map((step, i) => (
              <motion.div key={step.title} variants={fadeUp} className="text-center">
                <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full border border-primary/20 bg-primary/10">
                  <step.icon className="size-5 text-primary" />
                </div>
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-primary">
                  Step {i + 1}
                </p>
                <h3 className="mt-1 text-base font-semibold">{step.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{step.description}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </section>

      <section className="cb-page pt-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.45 }}
          className="cb-section p-8 text-center md:p-12"
        >
          <Car className="mx-auto mb-4 size-10 text-primary" />
          <h2 className="text-2xl font-semibold tracking-tight">
            Ready to take control of your car health?
          </h2>
          <p className="mx-auto mt-2 max-w-xl text-sm text-muted-foreground sm:text-base">
            Start with the free plan, then unlock deeper insights only when you
            need them.
          </p>
          <Link href={"/login" as never} className="mt-6 inline-flex">
            <Button size="lg" className="gap-2">
              Start for Free
              <ArrowRight className="size-4" />
            </Button>
          </Link>
        </motion.div>
      </section>

      <footer className="mt-10 border-t border-border/80 bg-card/40">
        <div className="cb-page !max-w-6xl py-10">
          <div className="grid gap-10 md:grid-cols-[1.4fr_1fr_1fr]">
            <div>
              <h3 className="text-lg font-semibold tracking-tight">
                Car Health Genius
              </h3>
              <p className="mt-3 max-w-md text-sm leading-relaxed text-muted-foreground">
                A clearer way to understand your vehicle, plan repairs, and make
                confident maintenance decisions.
              </p>
            </div>

            {footerColumns.map((column) => (
              <div key={column.heading}>
                <h4 className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  {column.heading}
                </h4>
                <ul className="mt-3 space-y-2">
                  {column.links.map((link) => (
                    <li key={link.href}>
                      <Link
                        href={link.href as never}
                        className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="mt-8 flex flex-wrap items-center gap-3 border-t border-border/70 pt-4">
            <Link
              href={"/privacy" as never}
              className="text-xs text-muted-foreground transition-colors hover:text-foreground"
            >
              Privacy
            </Link>
            <Link
              href={"/terms" as never}
              className="text-xs text-muted-foreground transition-colors hover:text-foreground"
            >
              Terms
            </Link>
            <Link
              href={"/support" as never}
              className="text-xs text-muted-foreground transition-colors hover:text-foreground"
            >
              Contact
            </Link>
            <div className="ml-auto flex items-center gap-2">
              {socialLinks.map((item) => (
                <a
                  key={item.label}
                  href={item.href}
                  target="_blank"
                  rel="noreferrer noopener"
                  aria-label={item.label}
                  className="rounded-md border border-border/70 bg-card p-1.5 text-muted-foreground transition-colors hover:text-foreground"
                >
                  <item.icon className="size-3.5" />
                </a>
              ))}
            </div>
          </div>

          <div className="mt-4 flex flex-col gap-2 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
            <p>© {year} Car Health Genius. All rights reserved.</p>
            <p>Built for drivers who want clarity, not guesswork.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
