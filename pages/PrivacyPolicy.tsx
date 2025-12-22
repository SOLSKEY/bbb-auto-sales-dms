import React from 'react';

const PrivacyPolicy: React.FC = () => {
    return (
        <div className="min-h-screen animated-bg text-slate-100 py-12 px-4">
            <div className="max-w-4xl mx-auto">
                <div className="glass-card-outline p-8 md:p-12">
                    <h1 className="text-4xl md:text-5xl font-bold mb-8 text-cyan-400" style={{
                        background: 'linear-gradient(to right, #67e8f9, #22d3ee, #06b6d4)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        backgroundClip: 'text',
                    }}>
                        Privacy Policy
                    </h1>
                    
                    <div className="space-y-8 text-slate-300 leading-relaxed">
                        <section>
                            <h2 className="text-2xl font-semibold mb-4 text-cyan-300">1. Introduction</h2>
                            <p>
                                BBB Auto Sales ("we," "our," or "us") is committed to protecting your privacy. This Privacy Policy 
                                explains how we collect, use, disclose, and safeguard your information when you use our Dealership 
                                Management System (DMS) and related services. Please read this policy carefully to understand our 
                                practices regarding your personal data.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-2xl font-semibold mb-4 text-cyan-300">2. Information We Collect</h2>
                            <p className="mb-4">
                                We collect information that you provide directly to us, including but not limited to:
                            </p>
                            <ul className="list-disc list-inside space-y-2 ml-4">
                                <li>Name, email address, phone number, and other contact information</li>
                                <li>Employee identification and role information</li>
                                <li>Vehicle inventory data, including VIN numbers and vehicle details</li>
                                <li>Sales transaction records and customer information</li>
                                <li>Payment and collections data</li>
                                <li>Appointment and calendar scheduling information</li>
                                <li>Usage data and system access logs</li>
                            </ul>
                        </section>

                        <section className="glass-card-outline p-6 bg-cyan-500/5 border-cyan-500/30">
                            <h3 className="text-xl font-bold mb-3 text-cyan-300">Privacy Policy for Employee Notifications</h3>
                            <p className="mb-4">
                                We value the privacy of our employees. We collect phone numbers solely for the purpose of sending 
                                internal schedule notifications and appointment reminders.
                            </p>
                            <p className="mb-4">
                                No mobile information will be shared with third parties/affiliates for marketing/promotional purposes. 
                                All the above categories exclude text messaging originator opt-in data and consent; this information 
                                will not be shared with any third parties.
                            </p>
                            <p className="font-semibold text-cyan-200">
                                We do not sell or share your contact information.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-2xl font-semibold mb-4 text-cyan-300">3. How We Use Your Information</h2>
                            <p className="mb-4">
                                We use the information we collect to:
                            </p>
                            <ul className="list-disc list-inside space-y-2 ml-4">
                                <li>Provide, maintain, and improve our dealership management services</li>
                                <li>Process and manage sales transactions and inventory</li>
                                <li>Track collections and payment records</li>
                                <li>Send internal notifications, appointment reminders, and schedule updates to employees</li>
                                <li>Generate reports and analytics for business operations</li>
                                <li>Ensure system security and prevent unauthorized access</li>
                                <li>Comply with legal obligations and regulatory requirements</li>
                                <li>Respond to your inquiries and provide customer support</li>
                            </ul>
                        </section>

                        <section>
                            <h2 className="text-2xl font-semibold mb-4 text-cyan-300">4. Information Sharing and Disclosure</h2>
                            <p className="mb-4">
                                We do not sell, trade, or rent your personal information to third parties. We may share your 
                                information only in the following circumstances:
                            </p>
                            <ul className="list-disc list-inside space-y-2 ml-4">
                                <li><strong>Service Providers:</strong> We may share information with trusted third-party service 
                                    providers who assist us in operating our system, such as cloud hosting providers, database 
                                    services, and SMS notification services, subject to strict confidentiality agreements.</li>
                                <li><strong>Legal Requirements:</strong> We may disclose information if required by law, court order, 
                                    or governmental authority, or to protect our rights, property, or safety.</li>
                                <li><strong>Business Transfers:</strong> In the event of a merger, acquisition, or sale of assets, 
                                    your information may be transferred as part of that transaction.</li>
                                <li><strong>With Your Consent:</strong> We may share information with your explicit consent or at 
                                    your direction.</li>
                            </ul>
                        </section>

                        <section>
                            <h2 className="text-2xl font-semibold mb-4 text-cyan-300">5. Data Security</h2>
                            <p>
                                We implement appropriate technical and organizational measures to protect your personal information 
                                against unauthorized access, alteration, disclosure, or destruction. These measures include:
                            </p>
                            <ul className="list-disc list-inside space-y-2 ml-4 mt-4">
                                <li>Encryption of data in transit and at rest</li>
                                <li>Role-based access controls and authentication requirements</li>
                                <li>Regular security assessments and updates</li>
                                <li>Secure database management with Row Level Security (RLS) policies</li>
                                <li>Employee training on data protection practices</li>
                            </ul>
                            <p className="mt-4">
                                However, no method of transmission over the Internet or electronic storage is 100% secure. While we 
                                strive to use commercially acceptable means to protect your information, we cannot guarantee absolute 
                                security.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-2xl font-semibold mb-4 text-cyan-300">6. Data Retention</h2>
                            <p>
                                We retain your personal information for as long as necessary to fulfill the purposes outlined in this 
                                Privacy Policy, unless a longer retention period is required or permitted by law. When we no longer 
                                need your information, we will securely delete or anonymize it in accordance with our data retention 
                                policies.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-2xl font-semibold mb-4 text-cyan-300">7. Your Rights and Choices</h2>
                            <p className="mb-4">
                                Depending on your location, you may have certain rights regarding your personal information, including:
                            </p>
                            <ul className="list-disc list-inside space-y-2 ml-4">
                                <li><strong>Access:</strong> Request access to your personal information</li>
                                <li><strong>Correction:</strong> Request correction of inaccurate or incomplete information</li>
                                <li><strong>Deletion:</strong> Request deletion of your personal information, subject to legal and 
                                    business requirements</li>
                                <li><strong>Opt-Out:</strong> Opt out of SMS notifications by texting "STOP" to the short code</li>
                                <li><strong>Data Portability:</strong> Request a copy of your data in a portable format</li>
                            </ul>
                            <p className="mt-4">
                                To exercise these rights, please contact us using the information provided in the "Contact Us" section 
                                below.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-2xl font-semibold mb-4 text-cyan-300">8. Children's Privacy</h2>
                            <p>
                                Our services are not intended for individuals under the age of 18. We do not knowingly collect 
                                personal information from children. If you believe we have inadvertently collected information from a 
                                child, please contact us immediately.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-2xl font-semibold mb-4 text-cyan-300">9. Changes to This Privacy Policy</h2>
                            <p>
                                We may update this Privacy Policy from time to time to reflect changes in our practices or for other 
                                operational, legal, or regulatory reasons. We will notify you of any material changes by posting the 
                                new Privacy Policy on this page and updating the "Last updated" date. We encourage you to review 
                                this Privacy Policy periodically.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-2xl font-semibold mb-4 text-cyan-300">10. Contact Us</h2>
                            <p className="mb-4">
                                If you have any questions, concerns, or requests regarding this Privacy Policy or our data practices, 
                                please contact us:
                            </p>
                            <div className="glass-card-outline p-4 bg-slate-800/30">
                                <p className="mb-2"><strong>BBB Auto Sales</strong></p>
                                <p className="mb-2">Dealership Management System</p>
                                <p className="mb-2">Email: bbbsmyrna@outlook.com</p>
                                <p>Phone: (615) 930-2955</p>
                            </div>
                        </section>

                        <section className="pt-4 border-t border-slate-700">
                            <p className="text-sm text-slate-400">
                                Last updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                            </p>
                        </section>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PrivacyPolicy;

