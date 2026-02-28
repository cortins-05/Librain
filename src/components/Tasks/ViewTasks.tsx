import { IStored } from "@/db/Models/Stored/main.model";

export default function ViewTasks({tasks}:{tasks:IStored[]}) {
  return (
    <main>
      {
        tasks.map(task=>(
            <p key={task.name}>{JSON.stringify(task)}</p>
        ))
      }
    </main>
  );
}