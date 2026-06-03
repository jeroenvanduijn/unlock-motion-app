import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider, useAuth } from "./lib/auth";
import { Protected } from "./components/Protected";
import { Layout } from "./components/Layout";

import Login from "./routes/public/Login";

import Dashboard from "./routes/member/Dashboard";
import Homework from "./routes/member/Homework";
import Exercise from "./routes/member/Exercise";
import Library from "./routes/member/Library";
import Track from "./routes/member/Track";
import Checkin from "./routes/member/Checkin";
import EvaluationBook from "./routes/member/EvaluationBook";
import EvaluationReport from "./routes/member/EvaluationReport";
import Profile from "./routes/member/Profile";

import Members from "./routes/coach/Members";
import MemberDetail from "./routes/coach/MemberDetail";
import Exercises from "./routes/coach/Exercises";
import ExerciseEdit from "./routes/coach/ExerciseEdit";
import HomeworkBuilder from "./routes/coach/HomeworkBuilder";
import Slots from "./routes/coach/Slots";
import EvaluationsList from "./routes/coach/EvaluationsList";
import EvaluationWrite from "./routes/coach/EvaluationWrite";

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, refetchOnWindowFocus: false, retry: 1 } },
});

function RootRedirect() {
  const { session, profile, loading } = useAuth();
  if (loading) return null;
  if (!session) return <Navigate to="/login" replace />;
  return <Navigate to={profile?.role === "coach" ? "/coach" : "/app"} replace />;
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<RootRedirect />} />
            <Route path="/login" element={<Login />} />

            <Route
              path="/app"
              element={
                <Protected role="member">
                  <Layout variant="app" />
                </Protected>
              }
            >
              <Route index element={<Dashboard />} />
              <Route path="huiswerk" element={<Homework />} />
              <Route path="oefening/:id" element={<Exercise />} />
              <Route path="library" element={<Library />} />
              <Route path="library/:protocol" element={<Track />} />
              <Route path="checkin" element={<Checkin />} />
              <Route path="evaluatie" element={<EvaluationBook />} />
              <Route path="evaluatie/:id" element={<EvaluationReport />} />
              <Route path="profile" element={<Profile />} />
            </Route>

            <Route
              path="/coach"
              element={
                <Protected role="coach">
                  <Layout variant="coach" />
                </Protected>
              }
            >
              <Route index element={<Members />} />
              <Route path="leden/:id" element={<MemberDetail />} />
              <Route path="leden/:id/huiswerk" element={<HomeworkBuilder />} />
              <Route path="exercises" element={<Exercises />} />
              <Route path="exercises/new" element={<ExerciseEdit />} />
              <Route path="exercises/:id" element={<ExerciseEdit />} />
              <Route path="slots" element={<Slots />} />
              <Route path="evaluations" element={<EvaluationsList />} />
              <Route path="evaluations/:id" element={<EvaluationWrite />} />
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
