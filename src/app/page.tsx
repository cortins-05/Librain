import { Button } from '@/components/ui/button';
import { dbConnect } from '@/db/dbConnect';
import StoredModel from '@/db/Models/Stored/main.model';
import { Plus } from 'lucide-react';
import Link from 'next/link';
import ViewTasks from '../components/Tasks/ViewTasks';

export default async function HomePage({searchParams}:{
  searchParams: {
    page: string
  }
}) {

  const {page} = await searchParams;

  await dbConnect();

  const tasks = await StoredModel.find().lean();

  return (
    <main className="flex-1 p-10 h-full flex flex-col overflow-y-scroll">
      <Link href={"/actions/addTask"} className='self-start'>
        <Button className='w-fit'>
          <Plus size={50} className='h-full w-auto font-bold' />
        </Button>
      </Link>
      <ViewTasks tasks={tasks} />
    </main>
  );
}
