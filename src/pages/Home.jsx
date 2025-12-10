import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Layout from "../components/Layout";
import Button from "../components/Button";
import "./Home.css";

const Home = () => {
  const { isAuthenticated } = useAuth();

  return (
    <Layout>
      <div className="home-container">
        <div className="home-hero">
          <h1 className="home-title">게시판에 오신 것을 환영합니다</h1>
          <p className="home-description">
            다양한 주제의 게시글을 작성하고 공유하세요
          </p>
          <div className="home-actions">
            {isAuthenticated ? (
              <Link to="/posts">
                <Button variant="primary" size="large">
                  게시글 보기
                </Button>
              </Link>
            ) : (
              <>
                <Link to="/login">
                  <Button variant="primary" size="large">
                    로그인
                  </Button>
                </Link>
                <Link to="/signup">
                  <Button variant="outline" size="large">
                    회원가입
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Home;
