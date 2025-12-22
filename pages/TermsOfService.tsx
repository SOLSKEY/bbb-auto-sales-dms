import React from 'react';

const TermsOfService: React.FC = () => {
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
                        Terms of Service
                    </h1>
                    
                    <div className="space-y-8 text-slate-300 leading-relaxed">
                        <section>
                            <h2 className="text-2xl font-semibold mb-4 text-cyan-300">1. Acceptance of Terms</h2>
                            <p>
                                By accessing and using the BBB Auto Sales Dealership Management System (DMS) and related services 
                                (collectively, the "Service"), you accept and agree to be bound by the terms and provisions of this 
                                agreement. If you do not agree to these Terms of Service, please do not use the Service.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-2xl font-semibold mb-4 text-cyan-300">2. Description of Service</h2>
                            <p className="mb-4">
                                The Service is a comprehensive dealership management system designed for Buy Here Pay Here (BHPH) 
                                auto dealerships. The Service includes, but is not limited to:
                            </p>
                            <ul className="list-disc list-inside space-y-2 ml-4">
                                <li>Inventory management and vehicle tracking</li>
                                <li>Sales transaction processing and record-keeping</li>
                                <li>Collections and payment management</li>
                                <li>Commission calculation and reporting</li>
                                <li>Calendar and appointment scheduling</li>
                                <li>Employee notifications via SMS</li>
                                <li>Analytics and reporting tools</li>
                                <li>Data management and export capabilities</li>
                            </ul>
                        </section>

                        <section className="glass-card-outline p-6 bg-cyan-500/5 border-cyan-500/30">
                            <h3 className="text-xl font-bold mb-4 text-cyan-300">Terms of Service for Employee SMS</h3>
                            <div className="space-y-4">
                                <div>
                                    <p className="font-semibold text-cyan-200 mb-2">Program Description:</p>
                                    <p>
                                        This service is used to send internal appointment reminders and schedule updates to dealership 
                                        employees.
                                    </p>
                                </div>
                                <div>
                                    <p className="font-semibold text-cyan-200 mb-2">Message Frequency:</p>
                                    <p>
                                        Message frequency varies based on the employee's schedule (approx. 3-5 messages/week).
                                    </p>
                                </div>
                                <div>
                                    <p className="font-semibold text-cyan-200 mb-2">Cost:</p>
                                    <p>
                                        Message and data rates may apply.
                                    </p>
                                </div>
                                <div>
                                    <p className="font-semibold text-cyan-200 mb-2">Opt-Out:</p>
                                    <p>
                                        You can cancel the SMS service at any time. Just text "STOP" to the short code. After you send 
                                        the SMS message "STOP" to us, we will send you an SMS message to confirm that you have been 
                                        unsubscribed. After this, you will no longer receive SMS messages from us.
                                    </p>
                                </div>
                                <div>
                                    <p className="font-semibold text-cyan-200 mb-2">Support:</p>
                                    <p>
                                        If you are experiencing issues with the messaging program, you can reply with the keyword HELP 
                                        for more assistance.
                                    </p>
                                </div>
                                <div>
                                    <p className="font-semibold text-cyan-200 mb-2">Carriers:</p>
                                    <p>
                                        Carriers are not liable for delayed or undelivered messages.
                                    </p>
                                </div>
                            </div>
                        </section>

                        <section>
                            <h2 className="text-2xl font-semibold mb-4 text-cyan-300">3. User Account and Access</h2>
                            <p className="mb-4">
                                To access the Service, you must have a valid user account provided by BBB Auto Sales. You are 
                                responsible for:
                            </p>
                            <ul className="list-disc list-inside space-y-2 ml-4">
                                <li>Maintaining the confidentiality of your account credentials</li>
                                <li>All activities that occur under your account</li>
                                <li>Notifying us immediately of any unauthorized use of your account</li>
                                <li>Ensuring that your account information is accurate and up-to-date</li>
                            </ul>
                            <p className="mt-4">
                                We reserve the right to suspend or terminate your account at any time for violation of these Terms 
                                or for any other reason we deem necessary to protect the security and integrity of the Service.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-2xl font-semibold mb-4 text-cyan-300">4. Role-Based Access and Permissions</h2>
                            <p className="mb-4">
                                Access to features and data within the Service is determined by your assigned role:
                            </p>
                            <ul className="list-disc list-inside space-y-2 ml-4">
                                <li><strong>Administrator:</strong> Full access to all features, including user management, data 
                                    editing, and system configuration.</li>
                                <li><strong>User:</strong> Limited access to view-only features as determined by your 
                                    administrator. Cannot edit data, delete records, or access administrative functions.</li>
                            </ul>
                            <p className="mt-4">
                                You agree to use the Service only in accordance with your assigned role and permissions. Attempting 
                                to access restricted features or data may result in immediate account termination.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-2xl font-semibold mb-4 text-cyan-300">5. Acceptable Use</h2>
                            <p className="mb-4">
                                You agree to use the Service only for lawful purposes and in accordance with these Terms. You agree 
                                NOT to:
                            </p>
                            <ul className="list-disc list-inside space-y-2 ml-4">
                                <li>Use the Service in any way that violates any applicable federal, state, local, or international 
                                    law or regulation</li>
                                <li>Attempt to gain unauthorized access to any portion of the Service or any other systems or 
                                    networks connected to the Service</li>
                                <li>Interfere with or disrupt the Service or servers or networks connected to the Service</li>
                                <li>Upload or transmit any viruses, malware, or other harmful code</li>
                                <li>Use automated systems (bots, scrapers, etc.) to access the Service without authorization</li>
                                <li>Modify, adapt, or hack the Service or attempt to reverse engineer any portion of the Service</li>
                                <li>Share your account credentials with unauthorized parties</li>
                                <li>Use the Service to store or process data that you do not have the legal right to store or process</li>
                            </ul>
                        </section>

                        <section>
                            <h2 className="text-2xl font-semibold mb-4 text-cyan-300">6. Data Accuracy and Responsibility</h2>
                            <p>
                                You are responsible for the accuracy, completeness, and legality of all data you enter into the 
                                Service. BBB Auto Sales is not responsible for errors, omissions, or inaccuracies in data entered by 
                                users. You agree to verify the accuracy of all data before relying on it for business decisions.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-2xl font-semibold mb-4 text-cyan-300">7. Intellectual Property</h2>
                            <p className="mb-4">
                                The Service, including its original content, features, functionality, design, and software, is owned 
                                by BBB Auto Sales and is protected by United States and international copyright, trademark, patent, 
                                trade secret, and other intellectual property laws.
                            </p>
                            <p>
                                You are granted a limited, non-exclusive, non-transferable license to access and use the Service for 
                                your internal business purposes only. This license does not include any right to:
                            </p>
                            <ul className="list-disc list-inside space-y-2 ml-4 mt-4">
                                <li>Reproduce, distribute, or create derivative works of the Service</li>
                                <li>Resell or sublicense access to the Service</li>
                                <li>Use the Service to build a competing product or service</li>
                            </ul>
                        </section>

                        <section>
                            <h2 className="text-2xl font-semibold mb-4 text-cyan-300">8. Service Availability and Modifications</h2>
                            <p>
                                We strive to provide reliable and continuous access to the Service, but we do not guarantee that the 
                                Service will be available at all times. The Service may be unavailable due to maintenance, updates, 
                                technical issues, or circumstances beyond our control. We reserve the right to modify, suspend, or 
                                discontinue any part of the Service at any time with or without notice.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-2xl font-semibold mb-4 text-cyan-300">9. Limitation of Liability</h2>
                            <p className="mb-4">
                                TO THE MAXIMUM EXTENT PERMITTED BY LAW, BBB AUTO SALES, ITS OFFICERS, DIRECTORS, EMPLOYEES, AGENTS, 
                                AND AFFILIATES SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE 
                                DAMAGES, INCLUDING BUT NOT LIMITED TO LOSS OF PROFITS, DATA, USE, GOODWILL, OR OTHER INTANGIBLE LOSSES, 
                                RESULTING FROM:
                            </p>
                            <ul className="list-disc list-inside space-y-2 ml-4">
                                <li>Your use or inability to use the Service</li>
                                <li>Any errors or omissions in the Service or data</li>
                                <li>Any interruption or cessation of transmission to or from the Service</li>
                                <li>Any bugs, viruses, or other harmful code that may be transmitted through the Service</li>
                                <li>Any unauthorized access to or use of our servers or data</li>
                            </ul>
                            <p className="mt-4">
                                Our total liability for any claims arising from or related to the Service shall not exceed the amount 
                                you paid to us in the twelve (12) months preceding the claim, or $100, whichever is greater.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-2xl font-semibold mb-4 text-cyan-300">10. Indemnification</h2>
                            <p>
                                You agree to indemnify, defend, and hold harmless BBB Auto Sales and its officers, directors, 
                                employees, agents, and affiliates from and against any and all claims, damages, obligations, losses, 
                                liabilities, costs, or debt, and expenses (including attorney's fees) arising from your use of the 
                                Service, your violation of these Terms, or your violation of any rights of another party.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-2xl font-semibold mb-4 text-cyan-300">11. Termination</h2>
                            <p>
                                We may terminate or suspend your account and access to the Service immediately, without prior notice 
                                or liability, for any reason, including if you breach these Terms. Upon termination, your right to 
                                use the Service will cease immediately. All provisions of these Terms that by their nature should 
                                survive termination shall survive, including ownership provisions, warranty disclaimers, indemnity, and 
                                limitations of liability.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-2xl font-semibold mb-4 text-cyan-300">12. Governing Law</h2>
                            <p>
                                These Terms shall be governed by and construed in accordance with the laws of the State of [Your State], 
                                without regard to its conflict of law provisions. Any disputes arising from or relating to these Terms 
                                or the Service shall be subject to the exclusive jurisdiction of the state and federal courts located 
                                in [Your County], [Your State].
                            </p>
                        </section>

                        <section>
                            <h2 className="text-2xl font-semibold mb-4 text-cyan-300">13. Changes to Terms</h2>
                            <p>
                                We reserve the right to modify these Terms at any time. We will notify users of any material changes by 
                                posting the new Terms of Service on this page and updating the "Last updated" date. Your continued 
                                use of the Service after any such changes constitutes your acceptance of the new Terms. We encourage you 
                                to review these Terms periodically.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-2xl font-semibold mb-4 text-cyan-300">14. Severability</h2>
                            <p>
                                If any provision of these Terms is found to be unenforceable or invalid, that provision shall be 
                                limited or eliminated to the minimum extent necessary, and the remaining provisions shall remain in full 
                                force and effect.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-2xl font-semibold mb-4 text-cyan-300">15. Contact Information</h2>
                            <p className="mb-4">
                                If you have any questions about these Terms of Service, please contact us:
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

export default TermsOfService;

