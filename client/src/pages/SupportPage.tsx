// SupportPage — Passenger Helpline & Indian Railways FAQ Directory
// Railway Reservation System v3.0 — Team 11, CSE 2271
// Academic Demonstration System — Presidency University, Bengaluru

import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  HelpCircle,
  PhoneCall,
  ChevronDown,
  ChevronUp,
  ArrowLeft,
  GraduationCap,
  FileQuestion
} from 'lucide-react';

export function SupportPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const faqs = [
    {
      q: 'How does automatic Waitlist promotion work in RailReserve?',
      a: 'RailReserve implements a strict First-In-First-Out (FIFO) queue for waiting-list passengers within atomic SQLite database transactions. When any confirmed passenger cancels their booking, the highest-priority waiting-list passenger is promoted to CONFIRMED status automatically, assigned the newly vacant coach and berth, and an in-app audit notification is generated.',
    },
    {
      q: 'What is the key difference between Reserved and Unreserved (UTS) tickets?',
      a: 'Reserved tickets allocate an explicit coach and berth (such as Coach B2, Berth 33) in AC or Sleeper classes for a specific train number and travel date. Unreserved (UTS) tickets provide point-to-point travel authorization in general second-class coaches without specific seat reservations and remain valid for 24 hours on any train of the chosen type.',
    },
    {
      q: 'What is the validity period and price of a Platform Ticket?',
      a: 'Platform tickets have a statutory demo rate of ₹10 per person. Each pass is strictly valid for 2 hours from the exact moment of issuance and grants admission to the station concourse, platforms, and passenger waiting halls.',
    },
    {
      q: 'Can a platform ticket be used to board and travel on a train?',
      a: 'No. Platform tickets are strictly prohibited for train travel. Boarding a train with a platform ticket is treated as ticketless travel under Section 138 of the Indian Railways Act and attracts penalty fares plus travel charges.',
    },
    {
      q: 'How are refunds calculated upon ticket cancellation?',
      a: 'RailReserve follows official IRCTC refund rules: cancellations made >48 hours prior to departure incur only the statutory clerkage fee (₹60 to ₹240 depending on class); cancellations between 12-48 hours deduct 25%; and cancellations between 4-12 hours deduct 50%. In this academic demonstration environment, refund credits are simulated instantaneously.',
    },
    {
      q: 'What security standards protect passenger accounts in RailReserve?',
      a: 'All passenger passwords are salted and hashed using bcrypt (10 rounds). Protected routes are guarded with cryptographic JSON Web Tokens (JWT) using the HS256 algorithm. All database modifications execute within atomic SQLite transactions to prevent race conditions or overbooking.',
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50 font-sans flex flex-col">
      {/* Header bar */}
      <div className="bg-slate-900 border-b border-slate-800 text-white py-3.5 px-4 shadow-sm">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Link to="/app" className="inline-flex items-center gap-2 text-slate-300 hover:text-white text-xs font-semibold">
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Dashboard</span>
          </Link>
          <div className="flex items-center gap-2">
            <HelpCircle className="w-4 h-4 text-blue-400" />
            <span className="text-xs font-bold uppercase tracking-wider text-blue-400">
              Passenger Help & Support Center
            </span>
          </div>
        </div>
      </div>

      <main className="flex-1 max-w-5xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-8">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">
            RailReserve Help & Support
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 mt-1 font-medium">
            24x7 Helpline directories, passenger FAQs, and academic evaluation guidelines
          </p>
        </div>

        {/* 1. Emergency Helpline Directory */}
        <section className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center gap-2">
            <PhoneCall className="w-5 h-5 text-orange-500" />
            <h2 className="text-lg font-bold text-slate-900">National Railway Helplines (Demo Directory)</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div className="p-4 rounded-2xl bg-orange-50/70 border border-orange-200 space-y-1">
              <div className="text-[10px] font-bold uppercase tracking-wider text-orange-800">Rail Madad Helpline</div>
              <div className="text-2xl font-black text-slate-900 font-mono">139</div>
              <p className="text-slate-600 mt-1 leading-relaxed">
                Toll-free 24x7 helpline for passenger grievances, medical emergency assistance, catering enquiry, and general train running status.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-blue-50/70 border border-blue-200 space-y-1">
              <div className="text-[10px] font-bold uppercase tracking-wider text-blue-800">Railway Protection Force (RPF)</div>
              <div className="text-2xl font-black text-slate-900 font-mono">182</div>
              <p className="text-slate-600 mt-1 leading-relaxed">
                Dedicated security helpline for safety emergencies, lost luggage reporting, and on-board assistance during railway transit.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-red-50/70 border border-red-200 space-y-1">
              <div className="text-[10px] font-bold uppercase tracking-wider text-red-800">Accident Relief & Emergency</div>
              <div className="text-2xl font-black text-slate-900 font-mono">1072</div>
              <p className="text-slate-600 mt-1 leading-relaxed">
                Emergency coordination desk for train derailment reports, medical dispatch teams, and passenger relief status.
              </p>
            </div>
          </div>
        </section>

        {/* 2. Frequently Asked Questions Accordion */}
        <section className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center gap-2">
            <FileQuestion className="w-5 h-5 text-blue-600" />
            <h2 className="text-lg font-bold text-slate-900">Frequently Asked Passenger Questions</h2>
          </div>

          <div className="space-y-3">
            {faqs.map((faq, idx) => (
              <div
                key={idx}
                className="rounded-2xl border border-slate-200 overflow-hidden transition"
              >
                <button
                  type="button"
                  onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                  className="w-full p-4 text-left font-bold text-sm text-slate-900 flex items-center justify-between bg-slate-50/50 hover:bg-slate-50 transition"
                >
                  <span>{faq.q}</span>
                  {openFaq === idx ? (
                    <ChevronUp className="w-4 h-4 text-slate-500 shrink-0" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-slate-500 shrink-0" />
                  )}
                </button>
                {openFaq === idx && (
                  <div className="p-4 text-xs text-slate-600 bg-white border-t border-slate-100 leading-relaxed">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* 3. Academic Evaluation Card */}
        <section className="bg-gradient-to-r from-slate-900 to-indigo-950 rounded-3xl p-6 sm:p-8 text-white space-y-4 shadow-xl">
          <div className="flex items-center gap-2.5">
            <GraduationCap className="w-6 h-6 text-orange-400" />
            <h2 className="text-lg font-bold text-white">Academic Project Reference</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs text-slate-300">
            <div>
              <span className="text-slate-400 uppercase font-bold text-[10px]">Institution:</span>
              <div className="text-white font-semibold mt-0.5">Presidency University, Bengaluru</div>
            </div>
            <div>
              <span className="text-slate-400 uppercase font-bold text-[10px]">Course & Code:</span>
              <div className="text-white font-semibold mt-0.5">Software Design and Development — CSE 2271</div>
            </div>
            <div>
              <span className="text-slate-400 uppercase font-bold text-[10px]">Project Team:</span>
              <div className="text-white font-semibold mt-0.5">Team 11</div>
            </div>
            <div>
              <span className="text-slate-400 uppercase font-bold text-[10px]">Application Name:</span>
              <div className="text-white font-semibold mt-0.5">RailReserve v3.0 (Full-Stack Railway Platform)</div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
