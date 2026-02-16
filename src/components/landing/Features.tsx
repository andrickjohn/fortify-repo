import { BarChart3, FileText, Lock, Users } from "lucide-react";

const features = [
    {
        name: 'Spend Analysis',
        description:
            'Visualize vendor spend across all categories. Identify trends and opportunities for consolidation.',
        icon: BarChart3,
    },
    {
        name: 'Contract Management',
        description:
            'Central repository for all vendor contracts. Automatic alerts for renewals and expiration dates.',
        icon: FileText,
    },
    {
        name: 'Secure & Compliant',
        description:
            'Enterprise-grade security with role-based access control. Compliant with education data privacy standards.',
        icon: Lock,
    },
    {
        name: 'Team Collaboration',
        description:
            'Assign tasks, track negotiations, and share savings reports with stakeholders instantly.',
        icon: Users,
    },
];

export function Features() {
    return (
        <div className="bg-slate-50 py-16 sm:py-20 lg:py-24">
            <div className="mx-auto max-w-7xl px-6 lg:px-8">
                <div className="mx-auto max-w-2xl lg:text-center">
                    <h2 className="text-base font-bold leading-7 text-indigo-600 tracking-wide uppercase">Analyze & Optimize</h2>
                    <p className="mt-2 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
                        Everything you need to manage school contracts
                    </p>
                    <p className="mt-4 text-lg leading-8 text-slate-600">
                        Stop relying on spreadsheets and scattered emails. Fortify gives you a single source of truth for all vendor relationships.
                    </p>
                </div>
                <div className="mx-auto mt-12 max-w-2xl sm:mt-16 lg:mt-20 lg:max-w-4xl">
                    <dl className="grid max-w-xl grid-cols-1 gap-x-8 gap-y-10 lg:max-w-none lg:grid-cols-2 lg:gap-y-16">
                        {features.map((feature) => (
                            <div key={feature.name} className="relative pl-16">
                                <dt className="text-base font-semibold leading-7 text-slate-900">
                                    <div className="absolute left-0 top-0 flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 shadow-md shadow-blue-200">
                                        <feature.icon className="h-5 w-5 text-white" aria-hidden="true" />
                                    </div>
                                    {feature.name}
                                </dt>
                                <dd className="mt-2 text-base leading-7 text-slate-600">{feature.description}</dd>
                            </div>
                        ))}
                    </dl>
                </div>
            </div>
        </div>
    );
}
