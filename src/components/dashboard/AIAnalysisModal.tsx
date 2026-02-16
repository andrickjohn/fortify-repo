import React, { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import {
    Bot, Sparkles, X, Check, AlertTriangle,
    FileText, ArrowRight, Loader2, DollarSign,
    ThumbsUp, ThumbsDown
} from 'lucide-react';

interface AIAnalysisModalProps {
    contractId: string;
    contractName: string;
    currentStatus: string;
    currentCost: number;
    isOpen: boolean;
    onClose: () => void;
    onUpdate: () => void;
}

export function AIAnalysisModal({
    contractId,
    contractName,
    currentStatus: initialStatus,
    currentCost: initialCost,
    isOpen,
    onClose,
    onUpdate
}: AIAnalysisModalProps) {
    const supabase = createClient();
    const [status, setStatus] = useState(initialStatus || 'not_started');
    const [cost, setCost] = useState(initialCost || 0);
    const [loading, setLoading] = useState(false);
    const [recommendations, setRecommendations] = useState<any>(null);

    // Mock Analysis Steps for Visual Feedback
    const [analysisStep, setAnalysisStep] = useState<string>('');

    useEffect(() => {
        if (isOpen && contractId) {
            fetchAnalysisData();
        }
    }, [isOpen, contractId]);

    const fetchAnalysisData = async () => {
        try {
            const { data, error } = await supabase
                .from('contracts')
                .select('ai_status, ai_cost, ai_recommendations')
                .eq('id', contractId)
                .single();

            if (error) {
                console.error("Error fetching AI data:", error);
                return;
            }

            if (data) {
                setStatus(data.ai_status || 'not_started');
                setCost(data.ai_cost || 0);
                setRecommendations(data.ai_recommendations);
            }
        } catch (err) {
            console.error("Failed to fetch analysis data", err);
        }
    };

    const startAnalysis = async () => {
        try {
            setLoading(true);
            setStatus('in_progress');

            // Simulate Analysis Steps
            const steps = [
                "Reading document structure...",
                "Identifying key terms...",
                "Comparing with market rates...",
                "Drafting negotiation strategy..."
            ];

            for (const step of steps) {
                setAnalysisStep(step);
                await new Promise(r => setTimeout(r, 1500));
            }

            // Mock Result Generation
            const mockResult = {
                summary: "This contract shows higher than average annual increase rates.",
                savings_opportunity: 15.5,
                key_risks: ["Auto-renewal clause", "Uncapped liability"],
                strategy: "Leverage multi-year commitment for 15% discount."
            };

            const newCost = cost + 0.45; // Simulated cost

            // Persist to DB
            const { error } = await supabase.from('contracts').update({
                ai_status: 'completed',
                ai_cost: newCost,
                ai_recommendations: mockResult
            }).eq('id', contractId);

            if (error) {
                throw error;
            }

            setRecommendations(mockResult);
            setCost(newCost);
            setStatus('completed');
            onUpdate();
        } catch (err: any) {
            console.error("Analysis failed:", err);
            setAnalysisStep("Error saving results. Please try again.");
            setStatus('not_started'); // Reset
        } finally {
            setLoading(false);
        }
    };

    const handleAction = async (action: 'approved' | 'rejected') => {
        await supabase.from('contracts').update({
            ai_status: action
        }).eq('id', contractId);

        setStatus(action);
        onUpdate();
        setTimeout(onClose, 1000);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in">
            <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden border border-slate-200">
                {/* Header */}
                <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
                            <Bot size={20} />
                        </div>
                        <div>
                            <h3 className="font-bold text-slate-900">AI Contract Review</h3>
                            <p className="text-xs text-slate-500">{contractName}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full text-slate-400 transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 min-h-[300px]">

                    {/* Running Cost Indicator */}
                    <div className="absolute top-20 right-6 flex items-center gap-1 bg-emerald-50 text-emerald-700 px-3 py-1 rounded-full text-xs font-bold border border-emerald-100">
                        <DollarSign size={12} />
                        Usage Cost: ${cost.toFixed(4)}
                    </div>

                    {status === 'not_started' && (
                        <div className="flex flex-col items-center justify-center h-full py-10 text-center space-y-6">
                            <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mb-2">
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
                                className="bg-blue-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-blue-700 transition-transform active:scale-95 shadow-lg shadow-blue-200 flex items-center gap-2"
                            >
                                <Bot size={18} />
                                Start Analysis ($0.45 est)
                            </button>
                        </div>
                    )}

                    {status === 'in_progress' && (
                        <div className="flex flex-col items-center justify-center h-full py-20 space-y-6">
                            <Loader2 size={48} className="text-blue-600 animate-spin" />
                            <div className="text-center space-y-2">
                                <h4 className="font-bold text-slate-900 text-lg">Analyzing Contract...</h4>
                                <p className="text-slate-500 text-sm font-mono animate-pulse">{analysisStep}</p>
                            </div>
                        </div>
                    )}

                    {(status === 'completed' || status === 'approved' || status === 'rejected') && recommendations && (
                        <div className="space-y-6 animate-in slide-in-from-bottom-2 fade-in duration-300">

                            {/* Summary Card */}
                            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                                <h5 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Analysis Summary</h5>
                                <p className="text-slate-700 font-medium text-sm leading-relaxed">{recommendations.summary}</p>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-green-50 p-4 rounded-xl border border-green-100">
                                    <h5 className="text-xs font-bold text-green-700 uppercase tracking-wider mb-1 flex items-center gap-2">
                                        <DollarSign size={14} /> Savings Opportunity
                                    </h5>
                                    <p className="text-2xl font-black text-green-700">{recommendations.savings_opportunity}%</p>
                                    <p className="text-xs text-green-600 mt-1">Estimated annual reduction</p>
                                </div>
                                <div className="bg-amber-50 p-4 rounded-xl border border-amber-100">
                                    <h5 className="text-xs font-bold text-amber-700 uppercase tracking-wider mb-1 flex items-center gap-2">
                                        <AlertTriangle size={14} /> Key Risks
                                    </h5>
                                    <ul className="text-xs text-amber-800 space-y-1 mt-2 list-disc pl-4">
                                        {recommendations.key_risks.map((risk: string, i: number) => (
                                            <li key={i}>{risk}</li>
                                        ))}
                                    </ul>
                                </div>
                            </div>

                            <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                                <h5 className="text-xs font-bold text-blue-700 uppercase tracking-wider mb-2 flex items-center gap-2">
                                    <Sparkles size={14} /> Detailed Strategy
                                </h5>
                                <p className="text-slate-700 text-sm">{recommendations.strategy}</p>
                            </div>

                            {status === 'completed' ? (
                                <div className="flex items-center gap-3 pt-4 border-t border-slate-100">
                                    <button
                                        onClick={() => handleAction('rejected')}
                                        className="flex-1 px-4 py-3 bg-white border border-slate-200 text-slate-600 rounded-xl font-bold hover:bg-slate-50 transition-colors flex items-center justify-center gap-2"
                                    >
                                        <X size={16} /> Cancel / Revision
                                    </button>
                                    <button
                                        onClick={() => handleAction('approved')}
                                        className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors shadow-lg shadow-blue-100 flex items-center justify-center gap-2"
                                    >
                                        <Check size={16} /> Approve & Negotiate
                                    </button>
                                </div>
                            ) : (
                                <div className={`text-center py-4 font-bold rounded-xl ${status === 'approved' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                    Analysis {status === 'approved' ? 'Approved for Negotiation' : 'Rejected'}
                                </div>
                            )}
                        </div>
                    )}

                </div>
            </div>
        </div>
    );
}
