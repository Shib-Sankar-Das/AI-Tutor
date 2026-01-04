import Link from 'next/link';
import { BookOpen, Brain, Globe, Mic, Image, FileText } from 'lucide-react';

export default function HomePage() {
  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <header className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary-500/10 via-accent-500/10 to-purple-500/10" />
        <nav className="relative z-10 container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Brain className="w-8 h-8 text-primary-600" />
              <span className="text-xl font-bold text-gray-900 dark:text-white">
                AI Tutor
              </span>
            </div>
            <div className="flex items-center gap-4">
              <Link
                href="/auth/login"
                className="text-gray-600 hover:text-gray-900 dark:text-gray-300"
              >
                Sign In
              </Link>
              <Link
                href="/auth/signup"
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
              >
                Get Started
              </Link>
            </div>
          </div>
        </nav>

        <div className="relative z-10 container mx-auto px-6 py-20 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-accent-100 text-accent-700 rounded-full text-sm font-medium mb-6">
            <Globe className="w-4 h-4" />
            Aligned with UN SDG 4: Quality Education
          </div>
          <h1 className="text-5xl md:text-6xl font-bold text-gray-900 dark:text-white mb-6">
            Your Personal
            <span className="text-primary-600"> AI Learning </span>
            Companion
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto mb-10">
            Experience the future of education with our Agentic AI Tutor. 
            Powered by advanced reasoning, visual synthesis, and multilingual support 
            to make quality education accessible to everyone.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/chat"
              className="px-8 py-4 bg-primary-600 text-white rounded-xl font-semibold hover:bg-primary-700 transition-colors flex items-center justify-center gap-2"
            >
              <BookOpen className="w-5 h-5" />
              Start Learning
            </Link>
            <Link
              href="#features"
              className="px-8 py-4 bg-white text-gray-700 rounded-xl font-semibold border border-gray-200 hover:bg-gray-50 transition-colors"
            >
              Learn More
            </Link>
          </div>
        </div>
      </header>

      {/* Features Section */}
      <section id="features" className="py-20 bg-white dark:bg-gray-800">
        <div className="container mx-auto px-6">
          <h2 className="text-3xl font-bold text-center text-gray-900 dark:text-white mb-4">
            Intelligent Features for Every Learner
          </h2>
          <p className="text-gray-600 dark:text-gray-300 text-center max-w-2xl mx-auto mb-12">
            Our agentic AI system goes beyond simple Q&A to provide personalized, 
            multi-modal learning experiences.
          </p>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <FeatureCard key={index} {...feature} />
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 bg-gray-50 dark:bg-gray-900">
        <div className="container mx-auto px-6">
          <h2 className="text-3xl font-bold text-center text-gray-900 dark:text-white mb-12">
            How It Works
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            {steps.map((step, index) => (
              <StepCard key={index} step={index + 1} {...step} />
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-primary-600">
        <div className="container mx-auto px-6 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            Ready to Transform Your Learning?
          </h2>
          <p className="text-primary-100 max-w-2xl mx-auto mb-8">
            Join thousands of learners worldwide who are already benefiting from 
            personalized AI tutoring. It's free to get started!
          </p>
          <Link
            href="/chat"
            className="inline-flex items-center gap-2 px-8 py-4 bg-white text-primary-600 rounded-xl font-semibold hover:bg-gray-100 transition-colors"
          >
            <Brain className="w-5 h-5" />
            Start Learning Now
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-10 bg-gray-900 text-gray-400">
        <div className="container mx-auto px-6">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center gap-2 mb-4 md:mb-0">
              <Brain className="w-6 h-6 text-primary-500" />
              <span className="text-white font-semibold">Agentic AI Tutor</span>
            </div>
            <p className="text-sm">
              Built for CSRBOX & IBM SkillsBuild Capstone Project | SDG 4 - Quality Education
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

const features = [
  {
    icon: Brain,
    title: 'Socratic Tutoring',
    description: 'Learn through guided questioning that helps you construct knowledge yourself, not just memorize facts.',
  },
  {
    icon: Image,
    title: 'Visual Learning',
    description: 'Complex concepts brought to life with AI-generated diagrams and visual analogies.',
  },
  {
    icon: Mic,
    title: 'Voice Interaction',
    description: 'Speak naturally with your tutor using speech-to-text and hear responses read aloud.',
  },
  {
    icon: FileText,
    title: 'Document RAG',
    description: 'Upload your textbooks and get answers grounded in your actual course materials.',
  },
  {
    icon: Globe,
    title: 'Multilingual Support',
    description: 'Learn in your preferred language with code-switching support for complex terms.',
  },
  {
    icon: BookOpen,
    title: 'Presentation Generator',
    description: 'Automatically create PowerPoint slides from any topic for study or teaching.',
  },
];

const steps = [
  {
    title: 'Ask Anything',
    description: 'Type or speak your question on any educational topic. Upload documents for context.',
  },
  {
    title: 'AI Reasons & Acts',
    description: 'Our agentic system analyzes your needs, retrieves relevant information, and crafts a personalized response.',
  },
  {
    title: 'Learn & Grow',
    description: 'Receive explanations, visuals, and follow-up questions designed to deepen your understanding.',
  },
];

function FeatureCard({ icon: Icon, title, description }: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
}) {
  return (
    <div className="p-6 bg-gray-50 dark:bg-gray-700 rounded-xl hover:shadow-lg transition-shadow">
      <div className="w-12 h-12 bg-primary-100 dark:bg-primary-900 rounded-lg flex items-center justify-center mb-4">
        <Icon className="w-6 h-6 text-primary-600 dark:text-primary-400" />
      </div>
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
        {title}
      </h3>
      <p className="text-gray-600 dark:text-gray-300">
        {description}
      </p>
    </div>
  );
}

function StepCard({ step, title, description }: {
  step: number;
  title: string;
  description: string;
}) {
  return (
    <div className="text-center">
      <div className="w-16 h-16 bg-primary-600 text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4">
        {step}
      </div>
      <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
        {title}
      </h3>
      <p className="text-gray-600 dark:text-gray-300">
        {description}
      </p>
    </div>
  );
}
