# Requirements Document

## Introduction

The Newsletter Grading System is a clean, Apple-inspired web application that helps users evaluate and improve their newsletter content. The system analyzes newsletter text for clarity, engagement, and effectiveness, then provides targeted suggestions for improvement. Built with macOS-style minimalism, the interface focuses on simplicity and functionality, using local AI models (Llama 3.2) for fast, private analysis without external dependencies.

## Requirements

### Requirement 1

**User Story:** As a newsletter writer, I want to paste my content into a clean, distraction-free editor and receive instant visual feedback on areas that need improvement, so that I can quickly identify and fix issues.

#### Acceptance Criteria

1. WHEN a user opens the application THEN the system SHALL display a clean, minimal interface with a single text input area
2. WHEN a user types or pastes newsletter content THEN the system SHALL analyze it in real-time using local Llama 3.2 model
3. WHEN analysis is complete THEN the system SHALL highlight problematic areas with subtle, non-intrusive visual indicators
4. WHEN highlighting is applied THEN the system SHALL use a clean color system (red for clarity issues, yellow for engagement problems, blue for tone issues)
5. IF the content is empty THEN the system SHALL show a subtle placeholder with sample newsletter text option

### Requirement 2

**User Story:** As a newsletter writer, I want the AI analysis to be fast and accurate using local models, so that I don't depend on external services and get consistent results.

#### Acceptance Criteria

1. WHEN the system starts THEN it SHALL automatically download and configure Llama 3.2 model locally
2. WHEN analyzing content THEN the system SHALL use a custom system prompt optimized for newsletter evaluation
3. WHEN processing text THEN the system SHALL identify clarity issues, engagement problems, and tone inconsistencies
4. WHEN analysis completes THEN the system SHALL return results in under 3 seconds for typical newsletter content
5. WHEN the local model is unavailable THEN the system SHALL display a clear error message with setup instructions

### Requirement 3

**User Story:** As a newsletter writer, I want to see my original content alongside improved suggestions in a clean, easy-to-compare format, so that I can understand what changes to make.

#### Acceptance Criteria

1. WHEN analysis finds issues THEN the system SHALL display a subtle "Improve" button in the interface
2. WHEN the user clicks "Improve" THEN the system SHALL generate better alternatives for problematic sections
3. WHEN improvements are ready THEN the system SHALL show a clean side-by-side comparison view
4. WHEN viewing comparisons THEN the system SHALL highlight specific changes with minimal visual styling
5. WHEN the user is satisfied THEN the system SHALL provide a simple copy button for the improved content

### Requirement 4

**User Story:** As a newsletter writer, I want the interface to feel like a native macOS application with clean typography, subtle interactions, and intuitive navigation, so that the tool feels professional and pleasant to use.

#### Acceptance Criteria

1. WHEN the application loads THEN it SHALL use system fonts (SF Pro or similar) and clean typography hierarchy
2. WHEN users interact with elements THEN the system SHALL provide subtle hover states and smooth transitions
3. WHEN displaying content THEN the system SHALL use generous white space and clear visual hierarchy
4. WHEN showing feedback THEN the system SHALL use minimal, non-intrusive notifications and indicators
5. WHEN the interface updates THEN all animations SHALL be smooth and purposeful, never distracting

### Requirement 5

**User Story:** As a newsletter writer, I want to understand my newsletter's overall quality with simple metrics, so that I can track improvement over time.

#### Acceptance Criteria

1. WHEN analysis completes THEN the system SHALL display a simple overall grade (A-F scale)
2. WHEN showing metrics THEN the system SHALL provide three key scores: Clarity, Engagement, and Tone
3. WHEN displaying scores THEN the system SHALL use clean, minimal progress indicators or simple number displays
4. WHEN content improves THEN the system SHALL show before/after score comparisons
5. WHEN metrics are displayed THEN they SHALL be easy to understand without technical jargon

### Requirement 6

**User Story:** As a newsletter writer, I want to quickly test the system with sample content, so that I can understand how it works before using my own newsletters.

#### Acceptance Criteria

1. WHEN the editor is empty THEN the system SHALL show a "Try Sample Newsletter" option
2. WHEN the user clicks the sample option THEN the system SHALL load realistic newsletter content
3. WHEN sample content loads THEN the system SHALL automatically analyze it to demonstrate functionality
4. WHEN using sample content THEN the system SHALL clearly indicate it's example content
5. WHEN the user starts typing THEN the system SHALL seamlessly replace sample content with user input

### Requirement 7

**User Story:** As a newsletter writer, I want the system to preserve my content formatting while analyzing the text, so that I don't lose my newsletter structure.

#### Acceptance Criteria

1. WHEN pasting formatted content THEN the system SHALL preserve basic formatting (bold, italic, links, lists)
2. WHEN analyzing content THEN the system SHALL work with both plain text and formatted content
3. WHEN showing improvements THEN the system SHALL maintain original formatting in suggestions
4. WHEN copying improved content THEN the system SHALL preserve formatting for pasting into email clients
5. WHEN displaying content THEN the system SHALL render formatting cleanly without visual clutter

### Requirement 8

**User Story:** As a newsletter writer, I want clear, actionable feedback on specific issues, so that I know exactly what to fix and why.

#### Acceptance Criteria

1. WHEN hovering over highlighted text THEN the system SHALL show a clean tooltip explaining the specific issue
2. WHEN displaying feedback THEN the system SHALL use simple, non-technical language
3. WHEN showing suggestions THEN the system SHALL provide specific examples of improvements
4. WHEN multiple issues exist THEN the system SHALL prioritize them by impact on newsletter effectiveness
5. WHEN feedback is shown THEN it SHALL be contextual and relevant to the specific highlighted content

### Requirement 9

**User Story:** As a newsletter writer, I want the system to work reliably offline and handle errors gracefully, so that I can always use the tool when needed.

#### Acceptance Criteria

1. WHEN the local AI model fails THEN the system SHALL display a clear error message with troubleshooting steps
2. WHEN network connectivity is lost THEN the system SHALL continue working with local models
3. WHEN the application encounters errors THEN it SHALL never lose user content
4. WHEN recovering from errors THEN the system SHALL restore the user's work automatically
5. WHEN errors occur THEN the system SHALL provide simple, actionable solutions

### Requirement 10

**User Story:** As a newsletter writer, I want keyboard shortcuts and efficient workflows, so that I can work quickly without constantly reaching for the mouse.

#### Acceptance Criteria

1. WHEN using the application THEN the system SHALL support standard keyboard shortcuts (Cmd+A, Cmd+C, Cmd+V)
2. WHEN content is ready for analysis THEN the user SHALL be able to trigger it with Cmd+Enter
3. WHEN viewing improvements THEN the user SHALL be able to navigate with arrow keys
4. WHEN copying improved content THEN the user SHALL be able to use Cmd+Shift+C
5. WHEN keyboard shortcuts are used THEN the system SHALL provide subtle visual feedback

### Requirement 11

**User Story:** As a newsletter writer, I want Fix My Mail to be completely rebuilt using GMMeditor AI capabilities with Llama 3.1, so that I can access professional-grade editing tools with sophisticated rewriting capabilities.

#### Acceptance Criteria

1. WHEN a user navigates to Fix My Mail THEN the system SHALL completely remove the current mockFixEmail system and implement GMMeditor rewriteWithLlama31
2. WHEN the AI editing process completes THEN the system SHALL display both original and improved content using the VirtualizedDiffViewer with real AI-generated improvements
3. WHEN content is being processed THEN the system SHALL show progress indicators consistent with Grade My Mail's MinimalPulsePopup
4. IF the GMMeditor Groq API fails THEN the system SHALL gracefully fallback to Grade My Mail's intelligent fallback analysis system
5. WHEN displaying the interface THEN the system SHALL maintain the same Apple-like design consistency as Grade My Mail

### Requirement 12

**User Story:** As a content creator, I want to control the tone and style of my email improvements in Fix My Mail using the GMMeditor tone system, so that I can maintain my brand voice and audience expectations with real AI-powered rewriting.

#### Acceptance Criteria

1. WHEN a user accesses Fix My Mail THEN the system SHALL provide a tone selector with GMMeditor's TONES options (Professional, Friendly, Persuasive, Analytical, Storytelling)
2. WHEN a user selects a different tone THEN the system SHALL call rewriteWithLlama31 with the new toneKey parameter to regenerate content
3. WHEN tone changes are applied THEN the system SHALL update the diff view using mapDrafts to show the new AI-generated improvements
4. WHEN no tone is selected THEN the system SHALL default to "friendly" toneKey as defined in GMMeditor
5. WHEN tone controls are displayed THEN they SHALL use the same styling patterns as Grade My Mail components

### Requirement 13

**User Story:** As a newsletter editor, I want to see detailed readability and improvement metrics in the new Fix My Mail, so that I can understand how the GMMeditor AI changes enhance my content quality.

#### Acceptance Criteria

1. WHEN content improvements are generated THEN the system SHALL display readability grade improvements using GMMeditor's analysis capabilities in a metrics panel
2. WHEN analysis completes THEN the system SHALL show before/after statistics for clarity, engagement, and spam risk using the same metrics system as Grade My Mail
3. WHEN metrics are displayed THEN the system SHALL use the same styling patterns as Grade My Mail's MetricsDisplay component
4. WHEN improvements reduce readability grade THEN the system SHALL highlight this as a positive change
5. WHEN showing metrics THEN the system SHALL maintain the clean, minimal aesthetic of the overall application

### Requirement 14

**User Story:** As a content writer, I want to see how the GMMeditor AI improved my content with clear highlighting of changes, so that I can understand what was modified and why.

#### Acceptance Criteria

1. WHEN GMMeditor rewriteWithLlama31 completes THEN the system SHALL receive both the improved text and mappings from mapDrafts function
2. WHEN displaying improvements THEN the system SHALL use the VirtualizedDiffViewer to show original vs improved content with highlighting
3. WHEN showing changes THEN the system SHALL use mapDrafts to identify unchanged, changed, inserted, and deleted sections
4. WHEN changes are highlighted THEN the system SHALL show word-level differences using the wordDiff data from mapDrafts
5. WHEN displaying the diff THEN the system SHALL maintain the same clean styling as the current VirtualizedDiffViewer component

### Requirement 15

**User Story:** As a user, I want real-time feedback during the new GMMeditor-powered Fix My Mail improvement process, so that I understand what the AI is doing and can track progress.

#### Acceptance Criteria

1. WHEN GMMeditor AI processing begins THEN the system SHALL show detailed progress indicators with descriptive messages about the rewriting process
2. WHEN different processing stages occur THEN the system SHALL update progress messages to reflect current operations (analyzing content, applying tone, optimizing readability)
3. WHEN processing takes longer than expected THEN the system SHALL provide reassuring feedback about the Groq API operation status
4. WHEN processing completes THEN the system SHALL smoothly transition to the results view showing the mapDrafts comparison
5. WHEN showing progress THEN the system SHALL use the same loading patterns and animations as Grade My Mail

### Requirement 16

**User Story:** As a user, I want to understand how the GMMeditor AI highlighting system works differently from the old tagged system, so that I can see precise improvements without needing pre-tagged content.

#### Acceptance Criteria

1. WHEN the AI processes content THEN the system SHALL use rewriteWithLlama31 to generate improved text directly from the original content
2. WHEN improvements are generated THEN the system SHALL use mapDrafts to automatically create sentence-level and word-level diff mappings
3. WHEN displaying changes THEN the system SHALL show unchanged sentences, changed sentences with word-level highlighting, inserted content, and deleted content
4. WHEN content has no tagged issues THEN the system SHALL still be able to improve it using the AI's understanding of good writing
5. WHEN showing improvements THEN the system SHALL not require the old fluff/spam_words/hard_to_read tags from Grade My Mail analysis

### Requirement 17

**User Story:** As a developer, I want to completely remove the old mock-based Fix My Mail system, so that there are no legacy dependencies or fallback to the fake AI system.

#### Acceptance Criteria

1. WHEN implementing the new Fix My Mail THEN the system SHALL remove all references to mockFixEmail functionality
2. WHEN the backend is updated THEN the system SHALL remove the /api/fix endpoint that uses mock improvements
3. WHEN error handling is implemented THEN the system SHALL never fallback to the old mock system
4. WHEN the new system fails THEN the system SHALL only fallback to Grade My Mail's intelligent analysis system
5. WHEN the implementation is complete THEN no traces of the old mock-based system SHALL remain in the codebase
