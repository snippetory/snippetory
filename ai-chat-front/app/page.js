"use client";

import { useState, useEffect, useRef } from "react";

// TypeWriter 컴포넌트 추가
const TypeWriter = ({ text }) => {
    const [displayText, setDisplayText] = useState('');
    const [currentIndex, setCurrentIndex] = useState(0);

    useEffect(() => {
        if (currentIndex < text.length) {
            const timer = setTimeout(() => {
                setDisplayText(prev => prev + text[currentIndex]);
                setCurrentIndex(prev => prev + 1);
            }, 100); // 타이핑 속도 (밀리초)

            return () => clearTimeout(timer);
        }
    }, [currentIndex, text]);

    return (
        <h2 style={{ 
            fontSize: "2rem", 
            color: "#333",
            marginBottom: "2rem",
            minHeight: "48px" // 텍스트 높이만큼 공간 확보
        }}>
            {displayText}
            <span style={{ opacity: currentIndex < text.length ? 1 : 0 }}>|</span>
        </h2>
    );
};

export default function Home() {
    const [messages, setMessages] = useState([]);
    const [inputValue, setInputValue] = useState("");
    const [loading, setLoading] = useState(false);
    const messageEndRef = useRef(null);
    const [currentPages, setCurrentPages] = useState({});
    const resultsPerPage = 10;
    const [isTyping, setIsTyping] = useState(false);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [expandedResults, setExpandedResults] = useState({});

    useEffect(() => {
        messageEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    useEffect(() => {
        if (messages.length > 0) {
            const lastMessageIndex = messages.length - 1;
            setExpandedResults(prev => ({
                ...prev,
                [lastMessageIndex]: true // 새 메시지의 RAG 결과를 기본적으로 펼침
            }));
        }
    }, [messages.length]);

    const fetchLLMResponse = async (customMessage = null) => {
        const userMessage = customMessage || inputValue;
        console.log('userMessage:', userMessage);
        setInputValue("");

        setMessages((prevMessages) => [...prevMessages, { user: userMessage }, { bot: "loading" }]);
        setLoading(true);

        try {
            const response = await fetch(`http://localhost:8000?req=${encodeURIComponent(userMessage)}`);
            
            // Response 객체의 주요 속성들 확인
            // console.log('Response 전체:', response);
            // console.log('Status:', response.status);
            // console.log('OK:', response.ok);
            // console.log('Headers:', response.headers);
            // console.log('Type:', response.type);
            
            // 실제 응답 데이터 확인
            const clonedResponse = response.clone(); // response는 한 번만 읽을 수 있으므로 clone
            const responseText = await clonedResponse.text();
            // console.log('Response body:', responseText);

            if (!response.ok) {
                throw new Error('API 응답 오류');
            }

            const data = JSON.parse(responseText);
            console.log('Parsed data:', data);

            // 메시지 업데이트
            setMessages((prevMessages) =>
                prevMessages.map((msg) => 
                    msg.bot === "loading" ? { 
                        bot: data.answer,
                        type: data.type,
                        results: data.rag.map(item => ({
                            title: item.page_content,
                            description: item.metadata.register_date,
                            id: item.metadata.id
                        }))
                    } : msg
                )
            );

            setLoading(false);
        } catch (error) {
            console.error('API 오류:', error);
            setMessages((prevMessages) => prevMessages.filter((msg) => msg.bot !== "loading"));
            setMessages((prevMessages) => [...prevMessages, { bot: "응답을 받을 수 없습니다. 다시 시도해주세요." }]);
            setLoading(false);
        }
    };

    const handleSendMessage = async () => {
        if (!inputValue.trim()) return;
        await fetchLLMResponse();
    };

    const handleInputChange = (e) => {
        const value = e.target.value;
        setInputValue(value);
        setIsTyping(value.length > 0);
    };

    // 히이지네이션 컴포넌트
    const Pagination = ({ totalResults, messageIndex, onPageChange }) => {
        // 결과가 resultsPerPage(10개) 이하면 페이지네이션을 표시하지 않음
        if (totalResults <= resultsPerPage) {
            return null;
        }

        const totalPages = Math.ceil(totalResults / resultsPerPage);
        const pageNumbers = [];
        const currentPage = currentPages[messageIndex] || 1;
        
        for (let i = 1; i <= totalPages; i++) {
            pageNumbers.push(i);
        }
        
        return (
            <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', marginTop: '10px' }}>
                <button 
                    onClick={() => onPageChange(messageIndex, currentPage - 1)}
                    disabled={currentPage === 1}
                    style={{ padding: '5px 10px', cursor: currentPage === 1 ? 'not-allowed' : 'pointer' }}
                >
                    이전
                </button>
                {pageNumbers.map(number => (
                    <button
                        key={number}
                        onClick={() => onPageChange(messageIndex, number)}
                        style={{
                            padding: '5px 10px',
                            cursor: 'pointer',
                            backgroundColor: currentPage === number ? '#0080FF' : 'white',
                            color: currentPage === number ? 'white' : 'black'
                        }}
                    >
                        {number}
                    </button>
                ))}
                <button 
                    onClick={() => onPageChange(messageIndex, currentPage + 1)}
                    disabled={currentPage === totalPages}
                    style={{ padding: '5px 10px', cursor: currentPage === totalPages ? 'not-allowed' : 'pointer' }}
                >
                    다음
                </button>
            </div>
        );
    };

    // 페이지 변경 핸들러 수정
    const handlePageChange = (messageIndex, newPage) => {
        setCurrentPages(prev => ({
            ...prev,
            [messageIndex]: newPage
        }));
    };

    // 버튼 클릭 핸들러 추가
    const handleActionButtonClick = async (action) => {
        let message = '';
        switch(action) {
            case 'image_create':
                message = '예제1입니다.';
                break;
            case 'image_analyze':
                message = '예제2입니다.';
                break;
            case 'advice':
                message = '예제3입니다.';
                break;
            case 'summary':
                message = '예제4입니다.';
                break;
            case 'more':
                message = '다른 기능을 알려주세요.';
                break;
        }
        setInputValue(message);
        await fetchLLMResponse(message);
    };

    // 토글 함수 추가
    const toggleResults = (index) => {
        setExpandedResults(prev => ({
            ...prev,
            [index]: !prev[index]
        }));
    };

    return (
        <>
            <style jsx global>{`
                @keyframes slideIn {
                    from {
                        transform: translateX(100%);
                    }
                    to {
                        transform: translateX(0);
                    }
                }
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
                body, html {
                    overflow: hidden; // 전체 스크롤 숨기기
                }
                /* 스크롤바 스타일링 */
                ::-webkit-scrollbar {
                    width: 8px;
                }
                
                ::-webkit-scrollbar-track {
                    background: transparent;
                }
                
                ::-webkit-scrollbar-thumb {
                    background: #888;
                    border-radius: 4px;
                }
                
                ::-webkit-scrollbar-thumb:hover {
                    background: #555;
                }
                
                /* Firefox 스크롤바 스타일링 */
                * {
                    scrollbar-width: thin;
                    scrollbar-color: #888 transparent;
                }
            `}</style>

            <div style={{ 
                display: "flex", 
                flexDirection: "column", 
                height: "100vh", 
                background: "#fff",
                overflow: "hidden" // 전체 컨테이너의 오버플로우 숨기기
            }}>
                {/* 헤더 */}
                <header style={{ 
                    padding: "15px 20px",
                    background: "#0080FF",
                    color: "white",
                    boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
                    zIndex: 1000,
                    flexShrink: 0,
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center"
                }}>
                    <div style={{ display: "flex", alignItems: "center" }}>
                        <h1 
                            onClick={() => {
                                setMessages([]); // 메시지 초기화
                                setInputValue(""); // 입력값 초기화
                                setCurrentPages({}); // 페이지 상태 초기화
                                setExpandedResults({}); // 확장/축소 상태 초기화
                            }}
                            style={{ 
                                margin: 0, 
                                fontSize: "1.5rem",
                                cursor: "pointer", // 클릭 가능함을 표시
                                userSelect: "none" // 텍스트 선택 방지
                            }}
                        >
                            AI Chatbot Template
                            <span style={{ 
                                fontSize: "0.6rem",
                                marginLeft: "5px",
                                padding: "2px 4px",
                                background: "rgba(255,255,255,0.2)",
                                borderRadius: "4px",
                                verticalAlign: "top",
                                position: "relative",
                                top: "-8px"
                            }}>
                                BETA
                            </span>
                        </h1>
                    </div>
                    <button 
                        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                        style={{
                            background: "transparent",
                            border: "none",
                            color: "white",
                            cursor: "pointer",
                            padding: "8px",
                            display: "flex",
                            flexDirection: "column",
                            gap: "4px",
                            width: "32px",
                            height: "32px",
                            justifyContent: "center"
                        }}
                    >
                        <span style={{ 
                            width: "20px", 
                            height: "2px", 
                            background: "white",
                            display: "block",
                            transition: "all 0.3s"
                        }}></span>
                        <span style={{ 
                            width: "20px", 
                            height: "2px", 
                            background: "white",
                            display: "block",
                            transition: "all 0.3s"
                        }}></span>
                        <span style={{ 
                            width: "20px", 
                            height: "2px", 
                            background: "white",
                            display: "block",
                            transition: "all 0.3s"
                        }}></span>
                    </button>
                </header>

                {/* 사이드바 추가 - return 문 안에 추가 */}
                {isSidebarOpen && (
                    <div 
                        style={{
                            position: "fixed",
                            top: 0,
                            left: 0,
                            width: "100%",
                            height: "100%",
                            background: "rgba(0, 0, 0, 0.5)",
                            zIndex: 1000,
                            display: "flex",
                            justifyContent: "flex-end"
                        }}
                        onClick={() => setIsSidebarOpen(false)}
                    >
                        <div 
                            style={{
                                width: "300px",
                                height: "100%",
                                background: "white",
                                boxShadow: "-2px 0 5px rgba(0, 0, 0, 0.1)",
                                padding: "20px",
                                animation: "slideIn 0.3s ease-out",
                                position: "relative"
                            }}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <button 
                                onClick={() => setIsSidebarOpen(false)}
                                style={{
                                    position: "absolute",
                                    top: "20px",
                                    right: "20px",
                                    background: "transparent",
                                    border: "none",
                                    fontSize: "1.5rem",
                                    cursor: "pointer",
                                    padding: "5px"
                                }}
                            >
                                ✕
                            </button>
                            <h2 style={{ marginTop: "40px" }}>메뉴</h2>
                            <ul style={{ 
                                listStyle: "none", 
                                padding: 0,
                                margin: "20px 0" 
                            }}>
                                <li style={{ padding: "10px 0", borderBottom: "1px solid #eee" }}>설정</li>
                                <li style={{ padding: "10px 0", borderBottom: "1px solid #eee" }}>히스토리</li>
                                <li style={{ padding: "10px 0", borderBottom: "1px solid #eee" }}>도움말</li>
                            </ul>
                        </div>
                    </div>
                )}

                {/* 메인 컨텐츠 */}
                <main style={{ 
                    flex: 1,
                    width: "100%", 
                    padding: "0px",
                    paddingBottom: "200px",  // 푸터 높이만큼 패딩
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: messages.length === 0 ? "center" : "flex-start",                
                    overflow: "hidden"  // 메인 영역 오버플로우 숨김
                }}>
                    {messages.length === 0 ? (
                        // 초기 화면
                        <div style={{
                            textAlign: "center",
                            maxWidth: "600px",
                            width: "100%"
                        }}>
                            <TypeWriter text="무엇을 도와드릴까요?" />
                            <div style={{
                                padding: "20px",
                                background: "#f8f9fa",
                                borderRadius: "12px",
                                marginBottom: "2rem"
                            }}>
                                <div style={{
                                    position: "relative",
                                    display: "flex",
                                    flexDirection: "column",
                                    gap: "10px"
                                }}>
                                    {!isTyping && (
                                        <div style={{
                                            display: "flex",
                                            gap: "10px",
                                            color: "#666",
                                            position: "absolute",
                                            top: "0",
                                            left: "0",
                                            padding: "0px"
                                        }}>
                                            <span>메시지</span>
                                            <span>ChatGPT</span>
                                        </div>
                                    )}
                                    <div style={{
                                        display: "flex",
                                        alignItems: "flex-end",
                                        gap: "10px",
                                        position: "relative"
                                    }}>
                                        <textarea
                                            style={{ 
                                                flex: 1, 
                                                padding: "20px, 0px, 50px, 0px",
                                                // paddingRight: "50px",
                                                border: "none",
                                                outline: "none",
                                                borderRadius: "8px",
                                                fontSize: "1rem",
                                                background: "transparent",
                                                resize: "none",  // 사용자가 크기 조절하지 못하게 설정
                                                minHeight: "24px",  // 한 줄 높이
                                                maxHeight: "216px", // 9줄 높이 (24px * 9)
                                                overflowY: "auto",  // 9줄 초과 시 스크롤 표시
                                                lineHeight: "24px", // 줄 높이 설정
                                            }}
                                            rows="1"
                                            value={inputValue}
                                            onChange={(e) => {
                                                handleInputChange(e);
                                                // 자동 높이 조절
                                                e.target.style.height = "24px";  // 초기화
                                                const newHeight = Math.min(e.target.scrollHeight, 216);  // 최대 9줄
                                                e.target.style.height = `${newHeight}px`;
                                            }}
                                            onKeyPress={(e) => {
                                                if (e.key === "Enter" && !e.shiftKey) {  // Shift + Enter는 줄바꿈
                                                    e.preventDefault();
                                                    handleSendMessage();
                                                }
                                            }}
                                            placeholder=""
                                        />
                                        <button 
                                            onClick={handleSendMessage}
                                            style={{
                                                padding: "8px",
                                                background: "#99CCFF",
                                                border: "none",
                                                borderRadius: "16px",
                                                cursor: "pointer",
                                                display: "flex",
                                                alignItems: "center",
                                                justifyContent: "center",
                                                position: "absolute",
                                                right: "0px",
                                                bottom: "0px",
                                                width: "36px",
                                                height: "36px"
                                            }}
                                        >
                                            <span style={{ 
                                                color: "white", 
                                                transform: "rotate(90deg)",
                                                fontSize: "1.2rem" 
                                            }}>
                                                ✈️
                                            </span>
                                        </button>
                                    </div>
                                </div>
                            </div>
                            <div style={{
                                display: "flex",
                                gap: "10px",
                                justifyContent: "center",
                                flexWrap: "wrap"
                            }}>
                                <button style={actionButtonStyle} onClick={() => handleActionButtonClick('image_create')}>이미지 만들기</button>
                                <button style={actionButtonStyle} onClick={() => handleActionButtonClick('image_analyze')}>이미지 분석</button>
                                <button style={actionButtonStyle} onClick={() => handleActionButtonClick('advice')}>조언 구하기</button>
                                <button style={actionButtonStyle} onClick={() => handleActionButtonClick('summary')}>텍스트 요약</button>
                                <button style={actionButtonStyle} onClick={() => handleActionButtonClick('more')}>더 보기</button>
                            </div>
                            <p style={{
                                color: "#6c757d",
                                marginTop: "2rem",
                                fontSize: "0.9rem"
                            }}>
                                LLM은 실수를 할 수 있습니다. 중요한 정보는 확인하세요.
                            </p>
                        </div>
                    ) : (
                        // 기존 채팅 메시지 영역
                        <div style={{ 
                            width: "100%", 
                            height: "100%", 
                            overflowY: "auto", 
                            display: "flex",
                            justifyContent: "center"
                        }}>
                            <div style={{
                                width: "100%",
                                maxWidth: "800px",
                                padding: "0 20px"
                            }}>
                                {messages.map((msg, index) => (
                                    <div key={index} style={{ display: "flex", justifyContent: msg.user ? "flex-end" : "flex-start", margin: "10px 0" }}>
                                        {msg.user ? (
                                            <div style={{ maxWidth: "60%", padding: "10px", background: "#e0f7fa", borderRadius: "10px", textAlign: "right" }}>
                                                {msg.user}
                                            </div>
                                        ) : msg.bot === "loading" ? (
                                            <div style={{ display: "flex", alignItems: "center", maxWidth: "80%", padding: "10px", background: "#eeeeee", borderRadius: "10px" }}>
                                                <div className="loader" style={{ marginRight: "10px", width: "16px", height: "16px", border: "2px solid #ccc", borderTop: "2px solid #000", borderRadius: "50%", animation: "spin 1s linear infinite" }}></div>
                                                <span>응답 대기 중...</span>
                                            </div>
                                        ) : (
                                            <div style={{ display: "flex", maxWidth: "80%", alignItems: "flex-start", flexDirection: "column" }}>
                                                <div style={{ display: "flex", alignItems: "center" }}>
                                                    <div style={{ 
                                                        width: "30px", 
                                                        height: "30px", 
                                                        marginRight: "10px",
                                                        display: "flex",
                                                        alignItems: "center",
                                                        justifyContent: "center"
                                                    }}>
                                                        <svg 
                                                            width="30" 
                                                            height="30" 
                                                            viewBox="0 0 100 100" 
                                                            fill="none" 
                                                            xmlns="http://www.w3.org/2000/svg"
                                                        >
                                                            <path 
                                                                d="M50 0C22.4 0 0 22.4 0 50s22.4 50 50 50 50-22.4 50-50S77.6 0 50 0zm0 90C27.9 90 10 72.1 10 50S27.9 10 50 10s40 17.9 40 40-17.9 40-40 40z"
                                                                fill="#0080FF"
                                                            />
                                                            <path 
                                                                d="M25 40c0-13.8 11.2-25 25-25s25 11.2 25 25-11.2 25-25 25S25 53.8 25 40zm35 0c0-5.5-4.5-10-10-10s-10 4.5-10 10 4.5 10 10 10 10-4.5 10-10z"
                                                                fill="#0080FF"
                                                            />
                                                            <circle cx="50" cy="40" r="5" fill="#0080FF"/>
                                                            <circle cx="35" cy="55" r="5" fill="#0080FF"/>
                                                            <circle cx="65" cy="55" r="5" fill="#0080FF"/>
                                                            <circle cx="35" cy="25" r="5" fill="#0080FF"/>
                                                            <circle cx="65" cy="25" r="5" fill="#0080FF"/>
                                                        </svg>
                                                    </div>
                                                    <div style={{ padding: "10px", background: "#eeeeee", borderRadius: "10px" }}>
                                                        {msg.bot}
                                                    </div>
                                                </div>
                                                {msg.type === 1 && msg.results && (
                                                    <div style={{ 
                                                        marginLeft: "40px", 
                                                        marginTop: "10px",
                                                        minHeight: expandedResults[index] ? `${Math.min(msg.results.length, resultsPerPage) * 80}px` : "auto"
                                                    }}>
                                                        <button 
                                                            onClick={() => toggleResults(index)}
                                                            style={{
                                                                background: "transparent",
                                                                border: "none",
                                                                color: "#0080FF",
                                                                cursor: "pointer",
                                                                marginBottom: "10px"
                                                            }}
                                                        >
                                                            {expandedResults[index] ? "접기 ▲" : "펼치기 ▼"}
                                                        </button>
                                                        {expandedResults[index] && (
                                                            <>
                                                                {msg.results
                                                                    .slice(
                                                                        ((currentPages[index] || 1) - 1) * resultsPerPage, 
                                                                        (currentPages[index] || 1) * resultsPerPage
                                                                    )
                                                                    .map((result) => (
                                                                        <div 
                                                                            key={result.id} 
                                                                            onClick={() => window.open(`http://a/${result.id}/`, '_blank')}
                                                                            style={{ 
                                                                                padding: "15px",
                                                                                margin: "5px 0",
                                                                                background: "#f5f5f5",
                                                                                borderRadius: "5px",
                                                                                cursor: "pointer",
                                                                                height: "auto",
                                                                                minHeight: "80px",
                                                                                transition: "background-color 0.2s",
                                                                                ':hover': {
                                                                                    backgroundColor: "#e0e0e0"
                                                                                }
                                                                            }}
                                                                        >
                                                                            <div style={{ 
                                                                                marginBottom: "10px",
                                                                                fontSize: "1.1em",
                                                                                fontWeight: "500"
                                                                            }}>
                                                                                {result.title}
                                                                            </div>
                                                                            <div style={{
                                                                                display: "grid",
                                                                                gridTemplateColumns: "1fr 1fr",
                                                                                gap: "10px",
                                                                                fontSize: "0.9em",
                                                                                color: "#666"
                                                                            }}>
                                                                                <div>ID: {result.id}</div>
                                                                                <div>등록일: {result.description}</div>
                                                                            </div>
                                                                        </div>
                                                                    ))}
                                                                <Pagination 
                                                                    totalResults={msg.results.length}
                                                                    messageIndex={index}
                                                                    onPageChange={handlePageChange}
                                                                />
                                                            </>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                ))}
                                <div ref={messageEndRef} />
                            </div>
                        </div>
                    )}
                </main>

                {/* 입력 영역 - 메시지가 있을 때만 표시 */}
                {messages.length > 0 && (
                    <div style={{ 
                        display: "flex",
                        padding: "10px 0 60px 0",
                        borderTop: "1px solid #eee",
                        background: "white",
                        flexShrink: 0,
                        position: "fixed",
                        bottom: 0,
                        width: "100%"
                    }}>
                        <div style={{
                            maxWidth: "800px",
                            width: "100%",
                            margin: "0 auto",
                            padding: "0 20px",
                            display: "flex"
                        }}>
                            <input
                                style={{ 
                                    flex: 1, 
                                    padding: "15px",
                                    border: "1px solid #ccc",
                                    borderRadius: "4px",
                                    marginRight: "10px"
                                }}
                                type="text"
                                value={inputValue}
                                onChange={handleInputChange}
                                onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
                                placeholder="메시지를 입력하세요..."
                            />
                            <button onClick={handleSendMessage} style={sendButtonStyle}>
                                보내기
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </>
    );
}
// 스타일 상수
const actionButtonStyle = {
    padding: "8px 16px",
    background: "#f8f9fa",
    border: "1px solid #dee2e6",
    borderRadius: "20px",
    cursor: "pointer",
    color: "#495057",
    fontSize: "0.9rem"
};

const sendButtonStyle = {
    padding: "15px 30px",
    background: "#0080FF",
    color: "white",
    border: "none",
    borderRadius: "4px",
    cursor: "pointer",
    fontWeight: "bold"
};

