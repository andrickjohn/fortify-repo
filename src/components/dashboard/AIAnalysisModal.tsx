import React, { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import {
    Bot, Sparkles, X, Check, AlertTriangle,
    FileText, ArrowRight, Loader2, DollarSign,
    ThumbsUp, ThumbsDown, Mail, Send, Edit3,
    Ban
} from 'lucide-react';

interface AIAnalysisModalProps {
    contractId: string;
    contractName: string;
    currentStatus: string;
    currentCost: number;
    annualValue: number;
    vendorName?: string;
    vendorId?: string;
    isOpen: boolean;
    onClose: () => void;
    onUpdate: () => void;
}

export function AIAnalysisModal({
    contractId,
    contractName,
    currentStatus: initialStatus,
    currentCost: initialCost,
    annualValue,
    vendorName,
    vendorId,
    isOpen,
    onClose,
    onUpdate
}: AIAnalysisModalProps) {
    const supabase = createClient();
    const [status, setStatus] = useState(initialStatus || 'not_started');
    const [cost, setCost] = useState(initialCost || 0);
    const [runningCost, setRunningCost] = useState(0);
    const [progress, setProgress] = useState(0);
    const [eta, setEta] = useState(0);

    // Workflow State
    const [viewState, setViewState] = useState<'idle' | 'analyzing' | 'results' | 'email_preview'>('idle');
    const [recommendations, setRecommendations] = useState<any>(null);

    // Email State
    const [emailSubject, setEmailSubject] = useState('');
    const [emailBody, setEmailBody] = useState('');
    const [contactEmail, setContactEmail] = useState('');
    const [isSending, setIsSending] = useState(false);

    // Mock Analysis Steps for Visual Feedback
    const [analysisStep, setAnalysisStep] = useState<string>('');
    const [abortController, setAbortController] = useState<AbortController | null>(null);
    const [showRejectConfirm, setShowRejectConfirm] = useState(false);

    useEffect(() => {
        if (isOpen && contractId) {
            fetchAnalysisData();
            // Reset state on open if starting fresh or if it was just closed
            if (initialStatus === 'not_started') {
                resetState();
            } else if (['completed', 'approved', 'rejected', 'negotiation_started'].includes(initialStatus)) {
                setViewState('results');
                if (initialStatus === 'negotiation_started') {
                    // Maybe fetch existing negotiation to show "View Email"?
                }
            }
        }
        return () => {
            if (abortController) abortController.abort();
        };
    }, [isOpen, contractId, initialStatus]);

    const resetState = () => {
        setViewState('idle');
        setProgress(0);
        setRunningCost(0);
        setStatus('not_started');
        setAnalysisStep('');
        setShowRejectConfirm(false);
    };

    const [districtId, setDistrictId] = useState<string | null>(null);

    const fetchAnalysisData = async () => {
        try {
            const { data, error } = await supabase
                .from('contracts')
                .select('ai_status, ai_cost, ai_recommendations, district_id')
                .eq('id', contractId)
                .single();

            if (data) {
                setStatus(data.ai_status || 'not_started');
                setCost(data.ai_cost || 0);
                setRecommendations(data.ai_recommendations);
                setDistrictId(data.district_id);

                if (['completed', 'approved', 'negotiation_started'].includes(data.ai_status)) {
                    setViewState('results');
                }
            }
        } catch (err) {
            console.error("Failed to fetch analysis data", err);
        }
    };

    // Attempt to fetch vendor contact info
    const fetchVendorContact = async () => {
        if (!vendorName) return;
        try {
            // Try to find a contact in vendors table
            // Note: Schema might not have email, so we might need to rely on what we have
            const { data } = await supabase
                .from('vendors')
                .select('*') // Grab all to see if there's an email field
                .eq('vendor_name', vendorName)
                .single();

            if (data) {
                // Check common fields
                const email = data.contact_email || data.email || data.sales_email || '';
                if (email) setContactEmail(email);
                else setContactEmail(`${vendorName.toLowerCase().replace(/\s/g, '.')}@example.com`);
            } else {
                setContactEmail(`${vendorName ? vendorName.toLowerCase().replace(/\s/g, '.') : 'contact'}@example.com`);
            }
        } catch (e) {
            setContactEmail('contact@example.com');
        }
    };

    const startAnalysis = async () => {
        const controller = new AbortController();
        setAbortController(controller);

        try {
            setViewState('analyzing');
            setStatus('in_progress');
            setProgress(0);

            // Persist start status
            await supabase.from('contracts').update({ ai_status: 'in_progress' }).eq('id', contractId);
            onUpdate(); // Update list to show "Analyzing..."

            let currentProgress = 0;
            let currentRunningCost = 0;
            const totalDuration = 5000; // 5 seconds total
            const intervalTime = 100;
            const steps = totalDuration / intervalTime;
            const costPerStep = 0.45 / steps;

            // Simulation Loop
            for (let i = 0; i <= steps; i++) {
                if (controller.signal.aborted) throw new Error('Cancelled');

                await new Promise(r => setTimeout(r, intervalTime));

                currentProgress = (i / steps) * 100;
                setProgress(Math.min(currentProgress, 99));

                currentRunningCost += costPerStep;
                setRunningCost(currentRunningCost);

                setEta(Math.ceil((totalDuration - (i * intervalTime)) / 1000));

                if (i < steps * 0.2) setAnalysisStep("Reading document structure...");
                else if (i < steps * 0.5) setAnalysisStep("Identifying key terms & risks...");
                else if (i < steps * 0.8) setAnalysisStep("Comparing with market rates...");
                else setAnalysisStep("Drafting negotiation strategy...");
            }

            // Mock Result Generation
            const mockResult = {
                summary: "This contract shows higher than average annual increase rates compared to market benchmarks.",
                savings_opportunity: 15.5,
                key_risks: ["Auto-renewal clause without notice", "Uncapped liability for data breach"],
                strategy: "Leverage multi-year commitment for 15% discount and cap liability at 2x annual value."
            };

            const finalCost = cost + 0.45;

            // Persist to DB
            await supabase.from('contracts').update({
                ai_status: 'completed',
                ai_cost: finalCost,
                ai_recommendations: mockResult
            }).eq('id', contractId);

            setRecommendations(mockResult);
            setCost(finalCost);
            setStatus('completed');
            setProgress(100);
            setViewState('results');
            onUpdate();
        } catch (err: any) {
            if (err.message === 'Cancelled') {
                console.log('Analysis cancelled by user');
                // Revert DB status
                await supabase.from('contracts').update({ ai_status: 'not_started' }).eq('id', contractId);
                onUpdate();
            } else {
                console.error("Analysis failed:", err);
                setAnalysisStep("Error saving results. Please try again.");
                setStatus('not_started');
                setViewState('idle');
            }
        } finally {
            setAbortController(null);
        }
    };

    const cancelAnalysis = () => {
        if (abortController) {
            abortController.abort();
        }
        resetState();
    };

    const prepareNegotiation = async () => {
        await fetchVendorContact();

        // Generate Mock Email Draft
        const subject = `Regarding ${contractName} - Renewal Discussion`;
        const body = `Dear ${vendorName || 'Partner'},\n\n` +
            `I hope this email finds you well.\n\n` +
            `We are currently reviewing our agreement for ${contractName} and have identified a few areas we would like to discuss before moving forward with a renewal.\n\n` +
            `Specifically, based on current market benchmarks, we are targeting a ${recommendations?.savings_opportunity || 15}% adjustment to the annual rate. We are also looking to standardize our liability clauses.\n\n` +
            `Would you be open to a brief call next week to discuss this?\n\n` +
            `Best regards,\n\n` +
            `[Your Name]\n` +
            `Fortify User`;

        setEmailSubject(subject);
        setEmailBody(body);
        setViewState('email_preview');
    };

    const submitNegotiation = async () => {
        setIsSending(true);
        try {
            // Calculate Spend
            const savingsPct = recommendations?.savings_opportunity || 0;
            const currentSpend = annualValue;
            const proposedSpend = annualValue * (1 - (savingsPct / 100));

            const { error: negError } = await supabase.from('negotiations').insert({
                contract_id: contractId,
                district_id: districtId, // Required by schema
                status: 'identified',
                current_annual_spend: currentSpend,
                proposed_annual_spend: proposedSpend
                // potential_savings is GENERATED ALWAYS, do not insert
                // vendor_name is calculated via join, do not insert
            });

            if (negError) throw negError;

            // 2. Update Contract Status
            await supabase.from('contracts').update({
                ai_status: 'negotiation_started'
            }).eq('id', contractId);

            setStatus('negotiation_started');
            onUpdate();

            // Artificial delay for UX
            setTimeout(() => {
                setIsSending(false);
                onClose();
            }, 1000);

        } catch (err: any) {
            console.error("Failed to submit negotiation:", err);
            alert(`Error starting negotiation: ${err.message || JSON.stringify(err)}`);
            setIsSending(false);
        }
    };

    const rejectAnalysis = () => {
        setShowRejectConfirm(true);
    };

    const confirmRejection = async () => {
        await supabase.from('contracts').update({ ai_status: 'not_started' }).eq('id', contractId);
        onUpdate();
        resetState();
    };

    if (!isOpen) return null;

    // Helper calculate savings
    const dollarSavings = annualValue * ((recommendations?.savings_opportunity || 0) / 100);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in">
            <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden border border-slate-200 flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex items-center justify-between flex-shrink-0">
                    <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${viewState === 'email_preview' ? 'bg-purple-100 text-purple-600' : 'bg-blue-100 text-blue-600'}`}>
                            {viewState === 'email_preview' ? <Mail size={20} /> : <Bot size={20} />}
                        </div>
                        <div>
                            <h3 className="font-bold text-slate-900">
                                {viewState === 'email_preview' ? 'Draft Negotiation' : 'AI Contract Review'}
                            </h3>
                            <p className="text-xs text-slate-500">{contractName}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full text-slate-400 transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {/* Body - Scrollable */}
                <div className="p-6 overflow-y-auto flex-1 relative">

                    {/* Cost Indicator */}
                    {(viewState !== 'idle') && (
                        <div className="absolute top-4 right-6 flex items-center gap-1 bg-emerald-50 text-emerald-700 px-3 py-1 rounded-full text-xs font-bold border border-emerald-100 z-10">
                            <DollarSign size={12} />
                            Cost: ${(viewState === 'analyzing' ? runningCost : cost).toFixed(4)}
                        </div>
                    )}

                    {viewState === 'idle' && (
                        <div className="flex flex-col items-center justify-center h-full py-10 text-center space-y-6">
                            <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mb-2 animate-pulse">
                                <Sparkles size={40} className="text-blue-500" />
                            </div>
                            <div className="max-w-md">
                                <h4 className="text-xl font-bold text-slate-900 mb-2">Start Smart Analysis</h4>
                                <p className="text-slate-500 text-sm">
                                    Our AI will analyze this contract for cost-saving opportunities, risk factors, and negotiation leverage.
                                </p>
                            </div>
                            <button
                                onClick={startAnalysis}
                                className="bg-blue-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-blue-700 transition-transform active:scale-95 shadow-lg shadow-blue-200 flex items-center gap-2 group"
                            >
                                <Bot size={18} className="group-hover:rotate-12 transition-transform" />
                                Start Analysis ($0.45 est)
                            </button>
                        </div>
                    )}

                    {viewState === 'analyzing' && (
                        <div className="flex flex-col items-center justify-center h-full py-20 space-y-8 w-full max-w-md mx-auto relative z-0">

                            {/* Fill Color Background Effect */}
                            <div
                                className="absolute inset-0 bg-blue-50/50 rounded-xl transition-all duration-300 ease-linear -z-10"
                                style={{
                                    clipPath: `inset(${100 - progress}% 0 0 0)` // Fills from bottom up
                                    // OR for Left to Right: clipPath: `inset(0 ${100 - progress}% 0 0)`
                                }}
                            />

                            <div className="text-center space-y-2 w-full z-10">
                                <h4 className="font-bold text-slate-900 text-lg">Analyzing Contract...</h4>
                                <p className="text-slate-500 text-sm font-mono">{analysisStep}</p>
                            </div>

                            {/* Progress Bar */}
                            <div className="w-full space-y-2 z-10">
                                <div className="h-4 w-full bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                                    <div
                                        className="h-full bg-blue-500 transition-all duration-300 ease-out"
                                        style={{ width: `${progress}%` }}
                                    ></div>
                                </div>
                                <div className="flex justify-between text-xs text-slate-400 font-bold px-1">
                                    <span>{Math.round(progress)}% Complete</span>
                                    <span>ETA: {eta}s</span>
                                </div>
                            </div>

                            <button
                                onClick={cancelAnalysis}
                                className="px-6 py-2 bg-white border border-red-200 text-red-500 rounded-lg hover:bg-red-50 font-bold text-xs transition-colors z-10 flex items-center gap-2"
                            >
                                <Ban size={14} />
                                Cancel Analysis
                            </button>
                        </div>
                    )}

                    {viewState === 'results' && recommendations && (
                        <div className="space-y-6 animate-in slide-in-from-bottom-2 fade-in duration-300">
                            {/* Summary Card */}
                            <div className="bg-slate-50 p-5 rounded-xl border border-slate-100">
                                <h5 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Analysis Summary</h5>
                                <p className="text-slate-800 font-medium text-sm leading-relaxed">{recommendations.summary}</p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="bg-green-50 p-5 rounded-xl border border-green-100 shadow-sm">
                                    <div className="flex items-start justify-between">
                                        <div>
                                            <h5 className="text-xs font-bold text-green-700 uppercase tracking-wider mb-1 flex items-center gap-2">
                                                <DollarSign size={14} /> Savings Opportunity
                                            </h5>
                                            <div className="flex flex-col gap-1 mt-2">
                                                <p className="text-3xl font-black text-green-700">{recommendations.savings_opportunity}%</p>
                                                {annualValue > 0 ? (
                                                    <span className="text-lg font-bold text-green-600">
                                                        ${dollarSavings.toLocaleString(undefined, { maximumFractionDigits: 0 })} / yr
                                                    </span>
                                                ) : (
                                                    <span className="text-xs text-green-600/70 py-1">Value unknown</span>
                                                )}
                                            </div>
                                            <p className="text-xs text-green-600 mt-2 font-medium opacity-80">Estimated annual reduction</p>
                                        </div>
                                    </div>
                                </div>
                                <div className="bg-amber-50 p-5 rounded-xl border border-amber-100 shadow-sm">
                                    <h5 className="text-xs font-bold text-amber-700 uppercase tracking-wider mb-2 flex items-center gap-2">
                                        <AlertTriangle size={14} /> Key Risks
                                    </h5>
                                    <ul className="space-y-2">
                                        {recommendations.key_risks.map((risk: string, i: number) => (
                                            <li key={i} className="flex items-start gap-2 text-xs text-amber-900">
                                                <span className="mt-0.5 w-1.5 h-1.5 rounded-full bg-amber-500 flex-shrink-0" />
                                                {risk}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </div>

                            <div className="bg-blue-50 p-5 rounded-xl border border-blue-100">
                                <h5 className="text-xs font-bold text-blue-700 uppercase tracking-wider mb-2 flex items-center gap-2">
                                    <Sparkles size={14} /> Detailed Strategy
                                </h5>
                                <p className="text-slate-700 text-sm leading-relaxed">{recommendations.strategy}</p>
                            </div>

                            {status === 'negotiation_started' ? (
                                <div className="text-center py-6 bg-purple-50 rounded-xl border border-purple-100">
                                    <h5 className="text-green-600 font-bold mb-2 flex items-center justify-center gap-2">
                                        <CheckCircle2 size={20} />
                                        Negotiation Active
                                    </h5>
                                    <p className="text-xs text-slate-500 mb-4">
                                        A negotiation record has been created and the email draft is ready.
                                    </p>
                                    <button
                                        onClick={onClose}
                                        className="px-6 py-2 bg-white border border-slate-200 rounded-lg text-slate-600 font-bold hover:bg-slate-50 text-sm"
                                    >
                                        Close & Go to Negotiations
                                    </button>
                                </div>
                            ) : (
                                <div className="pt-4 border-t border-slate-100">
                                    {showRejectConfirm ? (
                                        <div className="bg-red-50 p-4 rounded-xl border border-red-100 flex items-center justify-between animate-in fade-in slide-in-from-bottom-2">
                                            <div className="flex items-center gap-3 text-red-700 text-sm font-medium">
                                                <AlertTriangle size={18} />
                                                <span>Discard this analysis? This cannot be undone.</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={() => setShowRejectConfirm(false)}
                                                    className="px-3 py-1.5 bg-white border border-red-200 text-red-600 rounded-lg text-xs font-bold hover:bg-red-50 transition-colors"
                                                >
                                                    Cancel
                                                </button>
                                                <button
                                                    onClick={confirmRejection}
                                                    className="px-3 py-1.5 bg-red-600 text-white rounded-lg text-xs font-bold hover:bg-red-700 transition-colors shadow-sm"
                                                >
                                                    Yes, Discard
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-3">
                                            <button
                                                onClick={rejectAnalysis}
                                                className="flex-1 px-4 py-3 bg-white border border-slate-200 text-slate-600 rounded-xl font-bold hover:bg-slate-50 transition-colors flex items-center justify-center gap-2"
                                            >
                                                <X size={16} /> Reject Analysis
                                            </button>
                                            <button
                                                onClick={prepareNegotiation}
                                                className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors shadow-lg shadow-blue-100 flex items-center justify-center gap-2"
                                            >
                                                <Check size={16} /> Approve & Draft Email
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {viewState === 'email_preview' && (
                        <div className="space-y-6 animate-in slide-in-from-right-4 fade-in duration-300">

                            <div className="bg-yellow-50 border border-yellow-100 rounded-xl p-4 flex items-start gap-3">
                                <Sparkles className="text-yellow-600 flex-shrink-0 mt-0.5" size={18} />
                                <div>
                                    <h5 className="text-sm font-bold text-yellow-800">AI Negotiation Draft</h5>
                                    <p className="text-xs text-yellow-700 mt-1">
                                        We've drafted this email based on the identified {recommendations?.savings_opportunity}% savings opportunity. Review and edit before sending.
                                    </p>
                                </div>
                            </div>

                            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                                <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex flex-col gap-2">
                                    <div className="flex items-center gap-2 text-sm">
                                        <span className="text-slate-500 w-16 font-medium">To:</span>
                                        <input
                                            value={contactEmail}
                                            onChange={(e) => setContactEmail(e.target.value)}
                                            className="font-mono bg-white px-2 py-0.5 rounded border border-slate-200 text-xs text-slate-900 w-full focus:outline-none focus:border-blue-500"
                                            placeholder="vendor@example.com"
                                        />
                                    </div>
                                    <div className="flex items-center gap-2 text-sm">
                                        <span className="text-slate-500 w-16 font-medium">Subject:</span>
                                        <input
                                            value={emailSubject}
                                            onChange={(e) => setEmailSubject(e.target.value)}
                                            className="flex-1 bg-white px-2 py-1 rounded border border-slate-200 text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                        />
                                    </div>
                                </div>
                                <textarea
                                    value={emailBody}
                                    onChange={(e) => setEmailBody(e.target.value)}
                                    className="w-full h-64 p-4 text-slate-700 text-sm leading-relaxed focus:outline-none resize-none"
                                />
                            </div>

                            <div className="flex items-center gap-3 pt-2">
                                <button
                                    onClick={() => setViewState('results')}
                                    className="flex-1 px-4 py-3 bg-white border border-slate-200 text-slate-600 rounded-xl font-bold hover:bg-slate-50 transition-colors"
                                >
                                    Back
                                </button>
                                <button
                                    onClick={submitNegotiation}
                                    disabled={isSending}
                                    className="flex-[2] px-4 py-3 bg-purple-600 text-white rounded-xl font-bold hover:bg-purple-700 transition-colors shadow-lg shadow-purple-100 flex items-center justify-center gap-2 disabled:opacity-70"
                                >
                                    {isSending ? (
                                        <>
                                            <Loader2 size={18} className="animate-spin" />
                                            Start Negotiation...
                                        </>
                                    ) : (
                                        <>
                                            <Send size={18} />
                                            Approve & Create Negotiation
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    )}

                </div>
            </div>
        </div>
    );
}

// Helper icon
import { CheckCircle2 } from 'lucide-react';
