import React from 'react';
import { useHistory } from 'react-router-dom';
import useDocumentHeader from '@/hooks/useDocumentTitle';
import oldWidgetImage from '@/assets/images/old_widget.png';
import newWidgetImage from '@/assets/images/new_widget.png';

const WidgetSelection: React.FC = () => {
  useDocumentHeader({ title: 'Widget Customization' });
  const history = useHistory();

  const handleOldWidgetClick = () => {
    history.push('/old-widget');
  };

  const handleNewWidgetClick = () => {
    history.push('/customize-widget');
  };

  return (
    <div className="min-h-[calc(100vh-120px)] flex items-center justify-center p-4">
      <div className="max-w-5xl w-full">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-3">
            Choose Your Widget Editor
          </h1>
          <p className="text-lg text-gray-600">
            Select the widget customization experience that works best for you
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Old Widget Card */}
          <div
            onClick={handleOldWidgetClick}
            className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-2xl transition-all duration-300 cursor-pointer border-2 border-gray-200 hover:border-blue-400 transform hover:-translate-y-1 relative"
          >
            <div className="absolute top-4 right-4 z-10">
              <button
                className="bg-gray-600 text-white text-xs font-bold px-4 py-2 rounded-full shadow-lg"
                type="button"
                tabIndex={-1}
                style={{ pointerEvents: 'none' }}
              >
                Old Widget
              </button>
            </div>
            <div className="flex flex-col items-center text-center pt-8">
              <div className="mb-6 w-full max-w-md">
                <img
                  src={oldWidgetImage}
                  alt="Old Widget Preview"
                  className="w-full h-auto rounded-lg shadow-md"
                />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                Old Widget
              </h2>
              <p className="text-gray-600 mb-6">
                The classic widget customization interface with familiar
                features and controls you know and trust.
              </p>
              <button
                className="mt-auto px-8 py-3 bg-gray-700 text-white rounded-lg font-semibold hover:bg-gray-800 transition-colors duration-200"
                onClick={handleOldWidgetClick}
              >
                Use Old Widget
              </button>
            </div>
          </div>

          {/* New Widget Card */}
          <div
            onClick={handleNewWidgetClick}
            className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-2xl transition-all duration-300 cursor-pointer border-2 border-blue-400 hover:border-blue-600 transform hover:-translate-y-1 relative"
          >
            <div className="absolute top-4 right-4 z-10">
              <button
                className="text-white text-xs font-bold px-4 py-2 rounded-full shadow-lg"
                type="button"
                tabIndex={-1}
                style={{ pointerEvents: 'none', backgroundColor: '#0052CC' }}
              >
               New Widget
              </button>
            </div>
            <div className="flex flex-col items-center text-center pt-8">
              <div className="mb-6 w-full max-w-md">
                <img
                  src={newWidgetImage}
                  alt="New Widget Preview"
                  className="w-full h-auto rounded-lg shadow-md"
                />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                New Widget
              </h2>
              <p className="text-gray-600 mb-6">
                Experience our redesigned widget editor with an enhanced
                interface, improved performance, and modern features.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WidgetSelection;
